export interface UserConfig {
  eosAccount?: string;
  eosPrivateKey?: string;
  eosApiEndpoints?: string[];
  ethPrivateKey?: string;
  whaleExApiKey?: string;
  MXCAccessKey?: string;
  MXCSecretKey?: string;
}

// Should be initialized by init().
export const USER_CONFIG: UserConfig = {
  eosAccount: '',
  eosPrivateKey: '',
  ethPrivateKey: '',
  whaleExApiKey: '',
  MXCAccessKey: '',
  MXCSecretKey: '',
};

export const EOS_API_ENDPOINTS = [
  'http://api.main.alohaeos.com',
  'http://eos.eoscafeblock.com',
  'http://eos.infstones.io',
  'http://peer1.eoshuobipool.com:8181',
  'http://peer2.eoshuobipool.com:8181',
  'https://api.main.alohaeos.com',
  'https://api.redpacketeos.com',
  'https://api.zbeos.com',
  'https://bp.whaleex.com',
  'https://eos.eoscafeblock.com',
  'https://eos.infstones.io',
  'https://node.betdice.one',
  'https://node1.zbeos.com',
];

export const EOS_API_ENDPOINTS_BLACKLIST = [
  'http://api-mainnet.starteos.io',
  'https://api-mainnet.starteos.io',
  'https://api.eoslaomao.com',
  'https://mainnet.eoscannon.io',
];
