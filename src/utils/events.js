// TODO: refactor and write tests
// TODO: add example
/**
 * @description
 ```js
 // Demo

 events.publish('/page/load', {
	url: '/some/url/path' // any argument
});

 var subscription = events.subscribe('/page/load', function(obj) {
	// Do something now that the event has occurred
});

 // ...sometime later where I no longer want subscription...
 subscription.remove();

 //  var target = window.event ? window.event.srcElement : e ? e.target : null;
 ```
 */
export var events = (function() {
  let topics = {};
  let ownProperty = topics.hasOwnProperty;

  return {
    subscribe: function(topic, listener) {
      // Create the topic's object if not yet created
      if (!ownProperty.call(topics, topic)) {
        topics[topic] = [];
      }

      // Add the listener to queue
      let index = topics[topic].push(listener) -1;

      // Provide handle back for removal of topic
      return {
        remove: function() {
          delete topics[topic][index];
        }
      };
    },

    publish: function(topic, info) {
      // If the topic doesn't exist, or there's no listeners in queue, just leave
      if (!ownProperty.call(topics, topic)) {
        return;
      }

      // Cycle through topics queue, fire!
      topics[topic].forEach(function(item) {
        item(info !== undefined ? info : {});
      });
    }
  };

})();
