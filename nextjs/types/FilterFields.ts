export const FILTER_FIELDS = [
    { id: "down", label: "Down", type: "number" },
    { id: "distance", label: "Distance", type: "number" },
    { id: "yardline", label: "Yard Line", type: "number" },
    { id: "quarter", label: "Quarter", type: "number" },
    { id: "result_yards", label: "Play Yards", type: "number" },
    { id: "play_type", label: "Play Type", type: "enum", values: ["run", "pass", "penalty", "sack"] },
    { id: "calc_is_td", label: "Touchdown", type: "boolean" },
    { id: "calc_first_down", label: "First Down", type: "boolean" },
    { id: "calc_stop", label: "Defensive Stop", type: "boolean" },
    { id: "calc_no_huddle", label: "No Huddle", type: "boolean" },
    { id: "calc_shotgun", label: "Shotgun", type: "boolean" },
    { id: "en_cov_1_high", label: "Coverage 1 High", type: "boolean" },
    { id: "en_cov_2_high", label: "Coverage 2 High", type: "boolean" },
  ];
  