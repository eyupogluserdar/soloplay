const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withTrackPlayerIcon(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      
      // Target paths for different DPIs
      const drawableDirs = [
        'drawable',
        'drawable-hdpi',
        'drawable-mdpi',
        'drawable-xhdpi',
        'drawable-xxhdpi',
        'drawable-xxxhdpi'
      ];
      
      const sourcePath = path.join(projectRoot, 'assets', 'android-icon-monochrome.png');
      
      if (!fs.existsSync(sourcePath)) {
        console.warn('Monochrome icon not found at', sourcePath);
        return config;
      }

      for (const dir of drawableDirs) {
        const resPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', dir);
        if (!fs.existsSync(resPath)) {
          fs.mkdirSync(resPath, { recursive: true });
        }
        
        const targetPath = path.join(resPath, 'ic_notification.png');
        fs.copyFileSync(sourcePath, targetPath);
      }
      
      return config;
    },
  ]);
};
