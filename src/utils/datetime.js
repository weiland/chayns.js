export var datetime = {
  parseCSharpDate: function(cSharpDate) {
    return new Date(parseInt(cSharpDate.substr(6)));
  }
};
