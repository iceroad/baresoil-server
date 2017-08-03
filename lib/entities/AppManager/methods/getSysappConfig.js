const _ = require('lodash'),
  construct = require('runtype').construct,
  json = JSON.stringify
  ;

function getSysappConfig() {
  const config = this.config_;
  return construct('AppConfig', {
    appId: 1,
    name: 'System Application',
    server: {
      http: {
        allowUploads: true,
      },
      websocket: {
        allowConnections: true,
      },
    },
    sandbox: {
      environment: [
        {
          key: 'BARESOIL_CONFIG',
          value: json({
            useNativeTar: _.get(config, 'SerDe.useNativeTar'),
            nativeTarPath: _.get(config, 'SerDe.nativeTarPath'),
          }),
        },
      ],
    },
    status: 'enabled',
    users: [],
  }, { fillDefaults: true, strict: true });
}

module.exports = getSysappConfig;
