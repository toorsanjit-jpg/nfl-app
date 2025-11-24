# sync_schedule Edge Function

This Supabase Edge Function syncs NFL schedule data from RapidAPI into the `games_schedule` table.

## Setup

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Link your project** (if not already linked):
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. **Set environment variables**:
   ```bash
   supabase secrets set RAPIDAPI_KEY=your-rapidapi-key
   supabase secrets set RAPIDAPI_HOST=your-rapidapi-host
   ```

4. **Deploy the function**:
   ```bash
   supabase functions deploy sync_schedule
   ```

## Usage

Call the function with a `season` query parameter:

```bash
curl "https://your-project.supabase.co/functions/v1/sync_schedule?season=2024" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Or from your application:

```typescript
const { data, error } = await supabase.functions.invoke('sync_schedule', {
  body: { season: 2024 }
});
```

## Response

```json
{
  "season": 2024,
  "gamesInserted": 272,
  "gamesUpdated": 0,
  "totalProcessed": 272
}
```

## Database Schema

The function expects a `games_schedule` table with the following columns:

- `id` (text, primary key) - Game ID
- `season` (integer) - Season year
- `week` (integer, nullable) - Week number
- `start_time` (timestamptz, nullable) - Game start time
- `home_team_id` (text, nullable) - Home team abbreviation
- `away_team_id` (text, nullable) - Away team abbreviation
- `status` (text, nullable) - Game status (e.g., "STATUS_SCHEDULED", "STATUS_FINAL")

