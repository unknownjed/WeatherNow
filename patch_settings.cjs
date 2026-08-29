const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsPanel.tsx', 'utf8');

code = code.replace(
  ">\\n                    Device GPS\\n                  </button>",
  ">\\n                    {t('deviceLocation')}\\n                  </button>"
);

code = code.replace(
  ">\\n                    Primary Saved\\n                  </button>",
  ">\\n                    {t('savedLocations')}\\n                  </button>"
);

fs.writeFileSync('src/components/SettingsPanel.tsx', code);
