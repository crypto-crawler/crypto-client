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
  'http://eos.infstones.io',
  'https://eos.infstones.io',
  'http://eos.eoscafeblock.com',
  'https://eos.eoscafeblock.com',
  'https://node.betdice.one',
  'http://api.main.alohaeos.com',
  'http://api-mainnet.starteos.io',
  'https://bp.whaleex.com',
  'https://api.zbeos.com',
  'https://node1.zbeos.com',
  'https://api.main.alohaeos.com',
  'https://api.eoslaomao.com',
  'https://api-mainnet.starteos.io',
  'http://peer2.eoshuobipool.com:8181',
  'http://peer1.eoshuobipool.com:8181',
  'https://api.redpacketeos.com',
  'https://mainnet.eoscannon.io',
];
