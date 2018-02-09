function Squad (settings) {
  this.name = settings.name;
  this.gatheringpoint = settings.gatheringpoint;
  this.targetRoom = settings.targetRoom;
  this.requiredMembers = settings.requiredMembers;
  this.status = settings.status;
  this.memberNames = settings.memberNames;
}

Squad.Status = {waiting: 'waiting', moving: 'moving', attacking: 'attacking'};
Squad.Strategy = {tankAndHeal: 'tank', rush: 'rush'};

Squad.prototype.checkStatus = function () {

};

Squad.prototype.checkIsComplete = function () {

};

module.exports = Squad;
