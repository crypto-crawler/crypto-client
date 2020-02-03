import * as dotenv from 'dotenv';
import { UserConfig } from '../src/config/user_config';

export default function readUserConfig(): UserConfig {
  const ENV = dotenv.config().parsed!;

  const userConfig: UserConfig = {};
  Object.assign(userConfig, ENV);
  if (ENV.HUOBI_ACCOUNT_ID) {
    userConfig.HUOBI_ACCOUNT_ID = parseInt(ENV.HUOBI_ACCOUNT_ID, 10);
  }
  if (ENV.BITSTAMP_USER_ID) {
    userConfig.BITSTAMP_USER_ID = parseInt(ENV.BITSTAMP_USER_ID, 10);
  }

  return userConfig;
}
