
  cartogramRunning = false;
  routesRun = [];
  excludedSites = [999];
  //This is an array to hold the carto settings for reference by the clustering function
  cartogramsRun = [];
  refreshSet = 0;
  currentRoute = 0;

var typeHash = {road: "brown", overseas: "green", coastal: "lightgreen", upstream: "blue", downstream: "blue", ferry: "purple"}

var width = Math.max(960),
    height = Math.max(500);

var tile = d3.geo.tile()
    .size([width, height]);

projection = d3.geo.mercator()
    .scale((1 << 12) / 2 / Math.PI)
    .translate([width / 2, height / 2]);

var center = projection([12, 42]);

path = d3.geo.path()
    .projection(projection);

var zoom = d3.behavior.zoom()
    .scale(projection.scale() * 2 * Math.PI)
    .scaleExtent([1 << 12, 1 << 17])
    .translate([width - center[0], height - center[1]])
    .on("zoom", zoomed);

// With the center computed, now adjust the projection such that
// it uses the zoom behaviorÕs translate and scale.
projection
    .scale(1 / 2 / Math.PI)
    .translate([0, 0]);

svg = d3.select("#vizcontainer").append("svg")
    .attr("width", width)
    .attr("height", height)
    .on("click", function() {d3.select(".modal").style("display", "none")});

var raster = svg.append("g");

colorRamp=d3.scale.linear().domain([0,1,5,10]).range(["green", "yellow","orange","red"])

d3.json("july_topo.json", function(error, routes) {
  exposedroutes = routes;
  svg.call(zoom);
  
  var routeG = svg.append("g").attr("id", "routesContainer")

  routeG.selectAll(".routes")
  .data(topojson.object(routes, routes.objects.july2).geometries)
  .enter()
  .append("path")
  .attr("class", "routes")
  .attr("d", path)
  .style("stroke-width", 2)
  .style("stroke-opacity", .75)
  .style("stroke", function(d,i) {return colorRamp(d.properties.e)})
  .on("mouseover", function(d) {
	d3.select(this).transition().duration(500).style("stroke-opacity", 1);
	})
  .on("mouseout", function() {
	d3.select(this).transition().duration(500).style("stroke-opacity", .5);
	});

  refreshTimer = setTimeout('zoomComplete()', 100);


d3.csv("sites.csv", function(error, sites) {
  exposedsites = sites;
  siteHash = {};
  var sitesG = svg.append("g").attr("id","sitesG")
        .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")");
  for (x in exposedsites) {
    if(exposedsites[x]) {
      //Make this attribute an array to hold all the costs you've run
      exposedsites[x].cost = [];
      exposedsites[x].nearestCluster = 0;
      siteHash[exposedsites[x].id] = exposedsites[x].label;
    }
  }
  exposedsites.sort(function(a,b) {
    if (a.label > b.label)
    return 1;
    if (a.label < b.label)
    return -1;
    return 0;
    });
  var osites = sitesG.selectAll(".sites")
  .data(exposedsites)
  .enter()
  .append("g")
  .attr("id", function(d) {return "site_g_" + d.id})
  .attr("class", "site")
  .attr("transform", function(d) {return "translate(" + projection([d.x,d.y]) + ")scale(" + projection.scale() + ")"})
  .style("cursor", "pointer")
  .on("click", siteClick)
  .on("mouseover", siteOver)
  .on("mouseover", siteOut);

    var minX = 100;
    var maxX = -100;
    var minY = 100;
    var maxY = -100;
  
  for (x in exposedsites) {
    
    var projo = projection([exposedsites[x].x,exposedsites[x].y]);
    
    if (projo[0] < minX) {
      minX = projo[0]
    }
    if (projo[0] > maxX) {
      maxX = projo[0]
    }
    if (projo[1] < minY) {
      minY = projo[1]
    }
    if (projo[1] > maxY) {
      maxY = projo[1]
    }
  }
  
  mainXRamp = d3.scale.linear().domain([0,960]).range([minX,maxX]);
  mainYRamp = d3.scale.linear().domain([0,960]).range([minY,maxY]);
  
  osites
  .append("circle")
  .attr("r", 30 / zoom.scale())
  .attr("class", "sitecirc")

  osites
  .append("circle")
  .attr("r", 25 / zoom.scale())
  .attr("cx", -2 / zoom.scale())
  .attr("cy", -2 / zoom.scale())
  .style("fill", "brown")
  .attr("class", "sitecirctop")

var initialLabels = [50024,50017,50107,50108,50429,50235,50129,50341,50327]
for (x in initialLabels) {
document.getElementById("site_g_"+initialLabels[x]).parentNode.appendChild(document.getElementById("site_g_"+initialLabels[x]));
siteLabel("site_g_"+initialLabels[x]);
}

  svg.selectAll("path.results")
    .data(routesRun)
    .enter()
    .insert("path", "#sitesG")
    .attr("d", path)
    .attr("class", "results")
    .style("stroke", function(d) {return typeHash[d.properties.segment_type]})
    .style("stroke-width", 5)
    .style("opacity", .5)
  
    zoomed();
  startUp();
})
});

function startUp() {
    d3.select("#sourceSelectButton").selectAll("option")
  .data(exposedsites.filter(function (el) {return el.label != "x"}))
  .enter()
  .append("option")
  .style("display", function(d) {return d.label == "x" ? "none" : "block"})
  .html(function(d) {return d.label})
  .attr("value", function(d) {return d.id})

  d3.select("#targetSelectButton").selectAll("option")
  .data(exposedsites.filter(function (el) {return el.label != "x"}))
  .enter()
  .append("option")
  .style("display", function(d) {return d.label == "x" ? "none" : "block"})
  .html(function(d) {return d.label})
  .attr("value", function(d) {return d.id})

  d3.select("#monthSelectButton").selectAll("option")
  .data(['January','February','March','April','May','June','July','August','September','October','November','December'])
  .enter()
  .append("option")
  .html(function(d) {return d})
  .attr("value", function(d,i) {return i + 1})

  d3.select("#vehicleSelectButton").selectAll("option")
  .data([{l: 'Donkey',v: 'donkey',p:"c"},{l: 'Donkey',v: 'donkey',p:"c"},{l: 'Donkey',v: 'donkey',p:"c"},{l: 'Donkey',v: 'donkey',p:"c"},{l: 'Donkey',v: 'donkey',p:"c"},{l: 'Donkey',v: 'donkey',p:"c"},{l: 'Donkey',v: 'donkey',p:"c"},{l: 'Wagon', v:'wagon',p:"c"},{l: 'Passenger', v:'passenger',p:"c"}])
  .enter()
  .append("option")
  .html(function(d) {return d.l})
  .attr("value", function(d,i) {return d.v})
  
}

function zoomComplete() {
  
   if (cartogramRunning == true) {
    return;
   }
  d3.selectAll(".routes").style("display", "block")
  d3.selectAll(".results").style("display", "block")
  d3.selectAll(".routes")
      .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")")
      .style("stroke-width", 2 / zoom.scale());

  d3.selectAll(".results")
      .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")")
      .style("stroke-width", 10 / zoom.scale());
}

function zoomed() {
  d3.selectAll(".routes").style("display", "none")
  d3.selectAll(".results").style("display", "none")
  d3.selectAll(".modal").style("display", "none");
  d3.selectAll(".results").style("stroke", function(d) {return typeHash[d.properties.segment_type]})

	clearTimeout(refreshTimer);
	refreshTimer = setTimeout('zoomComplete()', 100);
	refreshSet++;
        
 if (cartogramRunning == false) {

  var tiles = tile
      .scale(zoom.scale())
      .translate(zoom.translate())
      ();

  var image = raster
      .attr("transform", "scale(" + tiles.scale + ")translate(" + tiles.translate + ")")
    .selectAll("image")
      .data(tiles, function(d) { return d; });

  image.exit()
      .remove();

  image.enter().append("image")
      .attr("xlink:href", function(d) { return "http://" + ["a", "b", "c", "d"][Math.random() * 4 | 0] + ".tiles.mapbox.com/v3/elijahmeeks.map-zm593ocx/" + d[2] + "/" + d[0] + "/" + d[1] + ".png"; })
      .attr("width", 1)
      .attr("height", 1)
      .attr("x", function(d) { return d[0]; })
      .attr("y", function(d) { return d[1]; });

}

d3.selectAll("path.hull")
    .style("stroke-width", 10 / zoom.scale())
    .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")");

d3.select("#sitesG")
    .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")");
  
d3.selectAll(".sitecirc")
    .attr("r", 30 / zoom.scale());

d3.selectAll(".sitecirctop")
  .attr("id", function(d,i) {return "sct" + d.id})
  .attr("r", 25 / zoom.scale())
  .attr("cx", -2 / zoom.scale())
  .attr("cy", -2 / zoom.scale());

d3.selectAll(".slabel")
  .attr("x", 2 / zoom.scale())
  .attr("y", -60 / zoom.scale())
  .attr("font-size", 100 / zoom.scale())
  .style("stroke-width", 25 / zoom.scale());
}

function colorBy(attribute) {
  resetButtons("routeLabelButton");
  d3.select("#"+attribute+"Button").classed("active", true)
  d3.selectAll(".routes")
  .transition().duration(500).style("stroke", function(d) {return colorRamp(d.properties[attribute])})
}

function colorByType() {
  resetButtons("routeLabelButton");
  d3.select("#tButton").classed("active", true)
  d3.selectAll(".routes")
  .transition().duration(500).style("stroke", function(d) {return typeHash[d.properties.t]}) 
}
function siteClick(d,i) {
  this.parentNode.appendChild(this);
  d3.event.stopPropagation();
  var coords = d3.mouse(document.body);
  var modalContents = d3.select("#sitemodal").style("display", "block").style("left", (coords[0] + 20) + "px").style("top", (coords[1] - 20) + "px").html('')
  
  modalContents.append("p").html(d.label)
    modalContents.append("p").attr("id","showLabelButton").style("display","none").html("<button onclick='siteLabel(\"site_g_"+d.id+"\")'>Label</button>")
    modalContents.append("p").attr("id","hideLabelButton").style("display","none").html("<button onclick='removeSiteLabel(\"site_g_"+d.id+"\")'>Remove Label</button>")

  if (d3.select("#site_g_"+d.id).selectAll("text").empty()) {
    d3.select("#showLabelButton").style("display","block")
  }
  else {
    d3.select("#hideLabelButton").style("display","block")
  }
  modalContents.append("p").html("<button>Remove</button>").on("click", function() {onOffSite(d)})
  modalContents.append("p").html("<button onclick='d3.select(this).remove();cartogram("+d.x+","+d.y+","+d.id+")'>Cartogram</button>")
  var costList = modalContents.append("ol")
  costList.selectAll("li").data(d.cost).enter().append("li").html(function(p) {return p});
}

function siteOver(d,i) {
  d3.select("#site_g_"+d.id+"_label").transition().duration(500).style("stroke-width", 75 / zoom.scale())
}

function siteOut(d,i) {
  d3.select("#site_g_"+d.id+"_label").transition().duration(500).style("stroke-width", 25 / zoom.scale())
}

function siteLabel(siteID) {
  d3.select("#showLabelButton").style("display","none")
  d3.select("#hideLabelButton").style("display","block")
  d3.select("#"+siteID).append('text').attr("class","slabel").text(function(d) {return d.label})
  .attr("x", 2 / zoom.scale())
  .attr("y", -60 / zoom.scale())
  .attr("font-size", 100 / zoom.scale())
  .attr("text-anchor", "middle")
  .attr("id", siteID + "_label")
  .style("stroke-width", 25 / zoom.scale())
  .style("stroke", "white")
  .style("opacity", .75)
  .style("pointer-events","none");
  d3.select("#"+siteID).append('text').attr("class","slabel").text(function(d) {return d.label})
  .attr("x", 2 / zoom.scale())
  .attr("y", -60 / zoom.scale())
  .attr("font-size", 100 / zoom.scale())
  .attr("text-anchor", "middle")
  .style("pointer-events","none")
  .style("stroke", "none");
}

function removeSiteLabel(siteID) {
  d3.select("#showLabelButton").style("display","block")
  d3.select("#hideLabelButton").style("display","none")
  d3.select("#"+siteID).selectAll('text').remove();
}


function resetButtons(buttonClass) {
  d3.selectAll("." + buttonClass).classed("active", false);  
}

function priorityClick(button) {
  resetButtons("priorityButton");
  d3.select(button).classed("active", true);
}

function flipButton(button) {
  d3.select(button).classed("active") == true ? d3.select(button).classed("active", false) : d3.select(button).classed("active", true);
}

function aquaticOptions(button) {
  switch(button.innerHTML)
  {
    case 'Civilian River':
    button.innerHTML = 'Military River';
    button.value = 'civriver';
    break;
    case 'Military River':
    button.innerHTML = 'Civilian River';
    button.value = 'milriver';
    break;
    case 'Fast Sea':
    button.innerHTML = 'Slow Sea';
    button.value = 'fastsea';
    break;
    case 'Slow Sea':
    button.innerHTML = 'Fast Sea';
    button.value = 'slowsea';
    break;
  }
  
}

function cartogram(centerX,centerY,centerID) {

  d3.select("#sitemodal").style("display", "none");
  d3.select("#hullButton").style("display","none");
  
  cartogramRunning = true;
  
  var newSettings = getSettings();
  newSettings["centerID"] = centerID;
  cartogramsRun.splice(0,0,newSettings)
  console.log("new_carto.php?v="+newSettings.vehicle+"&m="+newSettings.month+"&c="+centerID+"&tc="+newSettings.transfer+"&p="+newSettings.priority+"&ml="+newSettings.modes+"&el="+newSettings.excluded)
  d3.csv(cartoQuery, function(error,cartoData) {

  exposedCarto = cartoData;
  max = d3.max(cartoData, function(p) {return parseFloat(p["cost"])});
  mid = max / 2;

  var colorramp=d3.scale.linear().domain([-1,0,0.01,mid,max]).range(["lightgray","cyan","green","yellow","red"]);
  var costramp=d3.scale.linear().domain([0,max]).range([0,1]);

  for (x in exposedsites) {
    if(exposedsites[x]) {
      for (y in cartoData) {
        if (cartoData[y].target == exposedsites[x].id) {
          exposedsites[x].cost.splice(0,0,cartoData[y].cost);
          break;
        }
      }
    }
  }
  
  svg.selectAll("g.site")
  .transition()
  .duration(3000)
  .attr("transform", function(d) {return "translate("+ (mainXRamp(findx(d["cost"][0],d.x,d.y,centerX,centerY))) + "," + (mainYRamp(findy(d["cost"][0],d.x,d.y,centerX,centerY))) + ")scale(.159)";});

  svg.selectAll(".sitecirctop")
  .transition()
  .duration(3000)
  .style("fill", function(d) { return (colorramp(d["cost"][0]))});

  
  d3.selectAll("image").style("display", "none");
  d3.selectAll("path").style("display", "none");
  
  })
  function findx(costin, thisx, thisy, cenx, ceny)
  {
    var xramp=d3.scale.linear().domain([-8.5,43]).range([0,960]);
    var yramp=d3.scale.linear().domain([55.5,22.5]).range([0,960]);
    var costramp=d3.scale.linear().domain([0,max]).range([0,1000]);				
    var projectedCoordsThis = projection([thisx,thisy]);
    var projectedCoordsCen = projection([cenx,ceny]);						  
    var xdiff = xramp(projectedCoordsThis[0]) - xramp(projectedCoordsCen[0]) + .001;
    var ydiff = yramp(projectedCoordsThis[1]) - yramp(projectedCoordsCen[1]) + .001;		
    var hypotenuse = Math.sqrt((Math.pow(xdiff,2)) + (Math.pow(ydiff,2)));
    var ratio = costramp(costin) / hypotenuse;
    return (ratio * xdiff) + 480;
  }

  function findy(costin, thisx, thisy, cenx, ceny) {
    var xramp=d3.scale.linear().domain([-8.5,43]).range([0,960]);
    var yramp=d3.scale.linear().domain([55.5,22.5]).range([0,960]);
    var costramp=d3.scale.linear().domain([0,max]).range([0,1000]);
    var xdiff = xramp(thisx) - xramp(cenx) + .001;
    var ydiff = yramp(thisy) - yramp(ceny) + .001;
    var hypotenuse = Math.sqrt(Math.pow(xdiff,2) + Math.pow(ydiff,2));
    var ratio = costramp(costin) / hypotenuse;
    return (ratio * ydiff) + 480;
  }

}

function cartogramOff() {
  d3.select("#sitemodal").style("display", "none");
  cartogramRunning = false;
  d3.selectAll("image").style("display", "block");
  d3.selectAll("path").style("display", "block");
  d3.selectAll("g.site")
  .transition()
  .duration(3000)
  .attr("transform", function(d) {return "translate(" + projection([d.x,d.y]) + ")scale(" + projection.scale() + ")"})
  zoomed();
}

function calculateRoute() {
  var newSettings = getSettings();  
  d3.json(routeQuery, function(error,routeData) {
    exposedNewData = routeData;
    // Each segment needs to be tagged with the current route id so that later we can pull them out to measure them and show them
    for (x in routeData.features) {
      if (routeData.features[x]) {
	routeData.features[x].properties.routeID = currentRoute;
      }
    }
    currentRoute++;
    for (x in routeData.features) {
      routesRun.push(routeData.features[x])
    }

  svg.selectAll("path.results").remove();
  
  svg.selectAll("path.results")
    .data(routesRun)
    .enter()
    .insert("path", "#sitesG")
    .attr("d", path)
    .attr("class", "results")
    .style("stroke", function(d) {return typeHash[d.properties.segment_type]})
    .style("stroke-width", 4)
    .style("opacity", .75)
    .style("cursor", "pointer")
    .on("click", routeClick)

    zoomed();
    populateRouteDialogue(getSettings.source,getSettings.target,currentRoute - 1);  
  })
}

function getSettings() {

  var sourceID = document.getElementById("sourceSelectButton").value;
  var targetID = document.getElementById("targetSelectButton").value;
  var monthID = document.getElementById("monthSelectButton").value;
  
  var priority = 0;
  var modeList = '';
  
  d3.select("#cPriority").classed("active") == true ? priority = 1 : null;
  d3.select("#sPriority").classed("active") == true ? priority = 2 : null;  
  d3.select("#roadFlip").classed("active") == true ? modeList+='road' : null;
  
  if (d3.select("#riverFlip").classed("active") == true) {
    document.getElementById("aquaticRiver").value == 'milriver' ? modeList+='fastupfastdown' : modeList += 'upstreamdownstream'
  }
  if (d3.select("#seaFlip").classed("active") == true) {
    document.getElementById("aquaticSea").value == 'slowsea' ? modeList+='slowover' : modeList += 'overseas'
  }
  if (d3.select("#coastFlip").classed("active") == true) {
    document.getElementById("aquaticSea").value == 'slowsea' ? modeList+='slowcoast' : modeList += 'coastal'
  }
  if (d3.select("#dayFlip").classed("active") == true) {
    document.getElementById("aquaticSea").value == 'slowsea' ? modeList+='dayslow' : modeList += 'dayfast'
  }

  var vehicleType = document.getElementById("vehicleSelectButton").value;
  var transferCost = parseFloat(document.getElementById("transferCost").value);
  isNaN(transferCost) ? transferCost = 0 : null;
  
  modeList+="selfferrytransferctransferftransferotransferr";

  var excludedIDs = excludedSites.toString();
  
 return {modes: modeList, source: sourceID, target: targetID, month: monthID, priority: priority, vehicle: vehicleType, transfer: transferCost, excluded: excludedIDs}
  
}

function routeClick(d,i) {
  d3.event.stopPropagation();
  var coords = d3.mouse(document.body);
  var modalContents = d3.select("#sitemodal").style("display", "block").style("left", (coords[0] + 20) + "px").style("top", (coords[1] - 20) + "px").html('')
  
  modalContents.append("p").html(d.properties.segment_type)
  modalContents.append("p").html("Duration: " + d.properties.segmentduration);
  modalContents.append("p").html("Length: " + d.properties.segmentlength);
  modalContents.append("p").html("Expense (D): " + d.properties.segmentexpense_d);
  modalContents.append("p").html("Expense (W): " + d.properties.segmentexpense_w);
  modalContents.append("p").html("Expense (C): " + d.properties.segmentexpense_c);  
  populateRouteDialogue(d.properties.source,d.properties.target,d.properties.routeID);  
}

function populateRouteDialogue(inSource,inTarget,inRouteID) {
  d3.selectAll(".results").style("stroke", function(d) {return d.properties.routeID == inRouteID ? "white" : "gray"})
  
  var routeModalContents = d3.select("#routemodal").style("display", "block").style("left", "40px").style("top", "200px").html('')
  var segmentNumber = routesRun.filter(function (el) {return el.properties.routeID == inRouteID}).length;
  var durationSum = d3.sum(routesRun.filter(function (el) {return el.properties.routeID == inRouteID}), function (p,q) {return p.properties.segmentduration})
  var lengthSum = d3.sum(routesRun.filter(function (el) {return el.properties.routeID == inRouteID}), function (p,q) {return p.properties.segmentlength})
  var expCSum = d3.sum(routesRun.filter(function (el) {return el.properties.routeID == inRouteID}), function (p,q) {return p.properties.segmentexpense_c})
  var expDSum = d3.sum(routesRun.filter(function (el) {return el.properties.routeID == inRouteID}), function (p,q) {return p.properties.segmentexpense_d})
  var expWSum = d3.sum(routesRun.filter(function (el) {return el.properties.routeID == inRouteID}), function (p,q) {return p.properties.segmentexpense_w})
  
  routeModalContents.append("p").html("From " + inSource + " to " + inTarget)
  routeModalContents.append("p").html("There are " + segmentNumber + " segments (including transfers) for a total length of " +Math.floor(lengthSum) + "km")
  routeModalContents.append("p").html("The trip would last " + d3.round(durationSum,3) + " days")
  routeModalContents.append("p").html("Transport of 1kg of grain would have cost:")
  routeModalContents.append("p").html(" * " + d3.round(expDSum,3) + " by donkey")
  routeModalContents.append("p").html(" * " + d3.round(expWSum,3) + " by donkey")
  routeModalContents.append("p").html("" + d3.round(expCSum,3) + " per passenger")
}

function onOffSite(d) {
  d3.select("#sct" + d.id).style("opacity", .5)
  excludedSites.push("" +d.id+ "")
  //We also need to exclude the meta nodes that act as transfer points
  excludedSites.push("1" +d.id+ "")
  excludedSites.push("2" +d.id+ "")
  excludedSites.push("3" +d.id+ "")
  excludedSites.push("4" +d.id+ "")
}

function clusterSitesUI() {  
  var modalContents = d3.select("#sitemodal").style("display", "block").style("left", "200px").style("top", "200px").html('')
  modalContents.append("h2").html("Cluster Settings")
  
  var newSelector = modalContents.append("select").attr("id","clusterPrioritySelector").on("change", updateClusterUIList)
  
  newSelector.selectAll("option")
  .data(['Fastest','Cheapest','Shortest'])
  .enter()
  .append("option")
  .html(function(d) {return d})
  .attr("value", function(d,i) {return i})
  
  var availableCartos = modalContents.append("ul");
  
  var aCLI = availableCartos.selectAll("li").data(cartogramsRun).enter().append("li")
  .attr("class", "availCartos")
  
  aCLI.append("span")
  .html(function(d) {return "" + d.centerID})

  aCLI.append("input")
  .attr("type", "checkbox")
  .attr("class", "cartoOpt")
  .attr("checked", true)
  .attr("value", function(d) {return d.centerID});

  d3.selectAll(".availCartos")
  .style("display", function(p,q) {return 0 == p.priority ? "block" : "none"})
  
  modalContents.append("p").append("button").on("click", clusterSites).html("Cluster")
  modalContents.append("p").append("button").on("click", drawBorders).html("Borders")
}

function updateClusterUIList () {
  var selectorVal = this.value;
  d3.selectAll(".availCartos")
  .style("display", function(p,q) {return selectorVal == p.priority ? "block" : "none"})
}

function clusterSites() {
  var clusterFilter = document.getElementById("clusterPrioritySelector").value;
  activeCenters = [];
  matchedCartos = [];

  d3.selectAll(".cartoOpt").each(function() {this.checked ? activeCenters.push(parseInt(this.value)) : null})
  
  if (activeCenters.length == 0) {
    return;
  }
  
  for (x in exposedsites) {
    if (exposedsites[x]) {
      var maxVal = 1000;
      for (y in exposedsites[x]["cost"]) {
        if (activeCenters.indexOf(cartogramsRun[y].centerID) > -1 && cartogramsRun[y].priority == clusterFilter && parseFloat(exposedsites[x]["cost"][y]) < maxVal && parseInt(exposedsites[x]["cost"][y]) != -1) {
          exposedsites[x]["nearestCluster"] = y;
          maxVal = parseFloat(exposedsites[x]["cost"][y]);
        }
      }
    }
  }
  
  for (x in cartogramsRun) {
    if (cartogramsRun[x]) {
      if (cartogramsRun[x].priority == clusterFilter) {
        matchedCartos.push(x);
      }
    }
  }
  
  var clusterNumber = cartogramsRun.length;
  
  var clusterRamp=d3.scale.linear().domain([-1,0,clusterNumber / 2,clusterNumber]).range(["lightgray","blue","yellow","red"]);
  
  clusterOrdinal = d3.scale.category20().domain(matchedCartos)
  
    svg.selectAll(".sitecirctop")
  .transition()
  .duration(3000)
  .style("fill", function(d) { return d.cost[d["nearestCluster"]] == 0 ? "cyan" : (clusterOrdinal(d["nearestCluster"]))});
  
  d3.select("#hullButton").style("display","block")
}

function drawBorders() {
  d3.select("#hullContainer").remove();
  groupPath = function(d) {
    return "M" + d3.geom.hull(d.values.map(function(i) {
	return projection([i.x, i.y]);
    })).join("L") + "Z";
};
    groups = [];
    for (centerX in matchedCartos) {
	groups.push({
	    key: matchedCartos[centerX],
	    name: matchedCartos[centerX],
	    values: [],
	    color: clusterOrdinal(matchedCartos[centerX]),
	    id: "O" + matchedCartos
	})
	for (x in exposedsites) {
		if ((exposedsites[x])){
		    if (exposedsites[x]["nearestCluster"] == matchedCartos[centerX]) {
		    groups[(groups.length - 1)]["values"].push(exposedsites[x])
		}
	    }
	}
	if ((groups[(groups.length - 1)]["values"].length < 3) || (groups[(groups.length - 1)]["values"].length >= exposedsites.length)) {
	    groups.pop();
	}
    }

    var hullG = svg.insert("g", "#routesContainer").attr("id","hullContainer").selectAll("g.hull").data(groups).enter().append("g").attr("class","hull");
    
    hullG.append("path").attr("id",function(d) {return "hull" + d.key}).attr("class", "hull")
    .style("fill", function(d) {
	return d.color
    }).style("stroke", function(d) {
	return d.color
    })
    .style("stroke-width", 10 / zoom.scale())
    .style("stroke-linejoin", "round")
    .style("opacity", .40)
    .style("pointer-events", "none")
    .attr("d", groupPath)
    .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")");
}
