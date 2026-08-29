const fs = require('fs');
let code = fs.readFileSync('src/components/WeatherForecaster.tsx', 'utf8');
code = code.replace("      }\n    }\n  };\n  };\n", "      }\n    }\n  };\n");
fs.writeFileSync('src/components/WeatherForecaster.tsx', code);
