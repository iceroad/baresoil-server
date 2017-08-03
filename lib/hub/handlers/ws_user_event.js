module.exports = function onWsUserEvent(clientId, userEvent) {
  console.debug(`Hub: got ws_user_event ${JSON.stringify(userEvent)}.`);
  this.deps.Server.accept('ws_user_event', clientId, userEvent);
};
