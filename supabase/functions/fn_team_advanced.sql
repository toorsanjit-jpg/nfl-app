create or replace function fn_team_advanced(
  p_team_id text,
  p_filters jsonb,
  p_columns jsonb
)
returns jsonb
language plpgsql
as $$
declare
  sql text;
  where_sql text := '';
  col_sql text := '';
  result jsonb;
begin
  ----------------------------------------------------
  -- Build WHERE from p_filters
  ----------------------------------------------------
  if p_filters is not null then
    with recursive builder AS (
      select
        1 as idx,
        (p_filters->0) as grp
      union all
      select
        idx + 1,
        (p_filters->(idx))
      from builder
      where p_filters->(idx) is not null
    )
    select string_agg(
      '(' ||
      (select string_agg(
          case
            when r->>'operator' = 'between' then
              format('%I BETWEEN %L AND %L', r->>'field', (r->'value')->>0, (r->'value')->>1)
            when r->>'operator' = 'in' then
              format('%I IN (%s)', r->>'field',
                (select string_agg(quote_literal(val), ',')
                 from jsonb_array_elements_text(r->'value') val)
              )
            else
              format('%I %s %L', r->>'field', r->>'operator', r->>'value')
          end,
        (grp->'rules')
        ) || ')',
      ' ' || grp->>'logic' || ' '
    )
    into where_sql
    from builder;
  end if;

  if where_sql <> '' then
    where_sql := 'WHERE ' || where_sql;
  end if;

  ----------------------------------------------------
  -- Dynamic columns
  ----------------------------------------------------
  if p_columns is not null then
    select string_agg(
      format('%s AS %I', col->>'formula', col->>'name'),
      ', '
    )
    into col_sql
    from jsonb_array_elements(p_columns) col;
  end if;

  if col_sql = '' then
    col_sql := 'count(*) as total_plays';
  end if;

  ----------------------------------------------------
  -- Final Query
  ----------------------------------------------------
  sql := format(
    'SELECT %s FROM nfl_plays WHERE offense_team = %L %s',
    col_sql, p_team_id, case when where_sql <> '' then ' AND ' || substr(where_sql, 7) else '' end
  );

  execute sql into result;

  return result;
end;
$$;
