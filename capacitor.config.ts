import type { CapacitorConfig } from '@capacitor/cli';
import { CHOSEN_APP_NAME } from './src/appConfig';

const config: CapacitorConfig = {
  appId: 'com.lumenappstudio.myjungle',
  appName: CHOSEN_APP_NAME,
  webDir: 'dist',
};

export default config;
