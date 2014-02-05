//David Mimno's implementation in js of Poisson community detection

function testCommunities(incNodes,incLinks,incSelection) {
    var color = d3.scale.category20();
    var numCommunities = 8;
    
function maxIndex(x) {
  var maxValue = d3.max(x);
  return x.indexOf(maxValue);
}

  graphVariable = {nodes: incNodes, links: incLinks.objects.new_routes.geometries};
  
    graphVariable.nodes.forEach( function(node) {
    node.nodeStrength = 1;
    node.communities = [];
    node.communityBuffer = [];
    for (var community = 0; community < numCommunities; community++) {
      // Initialize with a small Exponential variate
      node.communities[community] = 0.01 * -Math.log(Math.random());
      node.communityBuffer[community] = 0.0;
    }
  });

  var communitySums = [];

  for (var iteration = 0; iteration < 200; iteration++) {
    for (var community = 0; community < numCommunities; community++) {
      communitySums[community] = 0.0;
    } 

    // Estimate community memberships for each edge
    graphVariable.links.forEach( function(el) {
        var edge = el.properties;
        edge.weight = 13.28 - edge["e"];
        if (edge.source && edge.target) {
//      if (edge.source.nodeStrength > 0 && edge.target.nodeStrength > 0) {
      var sourceCommunities = edge.source.communities;
      var targetCommunities = edge.target.communities;
      var distribution = [];

      // Multiply the two community membership vectors
      for (var community = 0; community < numCommunities; community++) {
        distribution[community] = sourceCommunities[community] * targetCommunities[community];
      }

      // Normalize and add to the gradient
      var normalizer = edge.weight / d3.sum(distribution);
      for (var community = 0; community < numCommunities; community++) {
        distribution[community] *= normalizer;
        communitySums[community] += distribution[community];
        edge.source.communityBuffer[community] += distribution[community];
        edge.target.communityBuffer[community] += distribution[community];
      }
        }
//      }
    });

    // We need to divide each node value by the square root of the community sum.
    var communityNormalizers = []
    for (var community = 0; community < numCommunities; community++) {
      communityNormalizers[community] = 1.0 / Math.sqrt(communitySums[community]);
    }

    // Update parameters and clear the buffer.
    graphVariable.nodes.forEach( function(node) {
      for (var community = 0; community < numCommunities; community++) {
        node.communities[community] = node.communityBuffer[community] * communityNormalizers[community];
        node.communityBuffer[community] = 0.0;
      }
    });
  }

  incSelection.select(".sitecirctop").style("fill", function(d) { return color(maxIndex(d.communities)); })
  
}