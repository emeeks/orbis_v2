
  cartogramRunning = false;
  voronoiRunning = false;
  routeSegments = [];
  excludedSites = [999];
  //This is an array to hold the carto settings for reference by the clustering function
  cartogramsRun = [];
  routesRun = [];
  refreshSet = 0;
  currentRoute = 0;
  lastCartoRan = 0;
  priorityName = ["Days", "Denarii", "KM"];
  var monthNames = [ "Zeroary", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December" ];
  settingsID = 0;
  frontierSetting = .8;
  directionHash = {0: "From", 1: "To"};
  sankeyHash = {};
  routeOpacity = false;
  
  betweennessScale = d3.scale.linear().domain([0,1,2]).range([0,10,30])

var typeHash = {road: "brown", overseas: "green", coastal: "#5CE68A", upstream: "blue", downstream: "blue", ferry: "purple"}

var width = Math.max(1600),
    height = Math.max(1000);

var tile = d3.geo.tile()
    .size([width, height]);

projection = d3.geo.mercator()
    .scale((1 << 12) / 2 / Math.PI)
    .translate([width / 2, height / 2]);

var center = projection([12, 42]);

path = d3.geo.path()
    .projection(projection);

brush = d3.svg.brush()
    .x(d3.scale.identity().domain([0, width]))
    .y(d3.scale.identity().domain([0, height]))
    .extent([[100, 100], [200, 200]])
    .on("brush", brushed);

zoom = d3.behavior.zoom()
    .scale(projection.scale() * 2 * Math.PI)
    .scaleExtent([1 << 12, 1 << 17])
    .translate([width - center[0], height - center[1]])
//    .center([width / 2,height / 2])
    .on("zoom", zoomed);
    
// With the center computed, now adjust the projection such that
// it uses the zoom behaviorÕs translate and scale.
projection
    .scale(1 / 2 / Math.PI)
    .translate([0, 0]);

svg = d3.select("#vizcontainer").append("svg")
    .attr("id", "mapSVG")
    .attr("width", "100%")
    .attr("height", "100%")
    .on("click", function() {d3.select(".modal").style("display", "none")});

var raster = svg.append("g").attr("id", "rasterG")

var brushG = svg.append("g")
    .attr("class", "brush")
    .style("display", "none")
    .call(brush);

svg.append("g")
    .attr("class", "zoom")
    .call(zoom)
    .append("rect")
    .attr("width", 1600)
    .attr("height", 1000)
    .style("opacity", 0);

//Class-based button functions

d3.selectAll(".tab").each(function() {
  addedFunction = "d3.select(this.parentNode).selectAll('.tab').classed('backtab',true);d3.select(this).classed('backtab', false);"
  combinedFunction = addedFunction + d3.select(this).attr("onclick");
  d3.select(this).attr("onclick", combinedFunction);
})

d3.selectAll(".navTab").on("click", function() {createEssay(d3.select(this).attr("data"))})

d3.selectAll(".helpicon").on("click", function() {contextualHelp(d3.select(this).attr("data"))})

colorRamp=d3.scale.linear().domain([0,1,5,10]).range(["#004e99","#7e8fc3","#c28711","#ad5041"])

d3.json("routes_topo.json", function(error, routes) {

d3.json("topocoast.json", function(error, coast) {
  exposedCoast = coast;
})

  exposedroutes = routes;
  exposedGeoms = topojson.feature(routes, routes.objects.new_routes).features;

  
  var routeG = svg.append("g").attr("id", "routesContainer")

  routeG.selectAll(".routes")
  .data(topojson.feature(routes, routes.objects.new_routes).features)
  .enter()
  .append("path")
  .attr("class", "routes links")
  .attr("d", path)
  .style("stroke-linecap", "round")
  .style("stroke", function(d) {return typeHash[d.properties.t]});

simplifiedGeoms = simplifyLines(d3.selectAll("path.routes"));

  routeG.selectAll(".routes")
  .data(simplifiedGeoms)
  .attr("d", path)
  
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
      exposedsites[x].betweenness = 0;
      siteHash[exposedsites[x].id] = exposedsites[x];
    }
  }
  
    exposedroutes.objects.new_routes.geometries.forEach(function(el) {

      //Adjust for metanodes
      if (el.properties.t == "road") {
	var oldS = el.properties.sid;
	el.properties.sid = el.properties.tid;
	el.properties.tid = oldS;
      }
      var realSource = el.properties.sid.toString().length == 6 ? el.properties.sid.toString().substring(1,6) : el.properties.sid;
      var realTarget = el.properties.tid.toString().length == 6 ? el.properties.tid.toString().substring(1,6) : el.properties.tid;
      
      el.properties.source = siteHash[realSource];
      el.properties.target = siteHash[realTarget];
      el.properties.fixedWidth = 2;
      el.properties.fixedColor = typeHash[el.properties.t];
      
    })

  exposedsites.sort(function(a,b) {
    if (a.label > b.label)
    return 1;
    if (a.label < b.label)
    return -1;
    return 0;
    });
  var osites = sitesG.selectAll(".site")
  .data(exposedsites)
  .enter()
  .append("g")
  .attr("id", function(d) {return "site_g_" + d.id})
  .attr("class", "site")
  .attr("transform", function(d) {return "translate(" + projection([d.x,d.y]) + ")scale(" + projection.scale() + ")"})
  .style("cursor", "pointer")
  .on("click", siteClick)
  .on("mouseover", siteOver)
  .on("mouseout", siteOut)
  .each(function(d) {
    d.cartoTranslate = "translate(" + projection([d.x,d.y]) + ")scale(" + projection.scale() + ")";
  });

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
  .attr("r", scaled(30))
  .attr("class", "sitecirc")

  osites
  .append("circle")
  .attr("r", scaled(25))
  .attr("cx", scaled(-2))
  .attr("cy", scaled(-2))
  .style("fill", "#ad5041")
  .attr("class", "sitecirctop")

var initialLabels = [50024,50017,50107,50108,50429,50235,50129,50341,50327]
for (x in initialLabels) {
document.getElementById("site_g_"+initialLabels[x]).parentNode.appendChild(document.getElementById("site_g_"+initialLabels[x]));
siteLabel("site_g_"+initialLabels[x]);
}

  svg.selectAll("path.results")
    .data(routeSegments)
    .enter()
    .insert("path", "#sitesG")
    .attr("d", path)
    .attr("class", "results")
    .style("stroke-width", 5)
    .style("opacity", .5)
  
    zoomed();
  startUp();
})
});

function startUp() {
  
  orbisTutorial = new tut;
  tutorial(1);
  
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

  d3.select("#vehicleSelectButton").selectAll("option")
  .data([{l: 'Foot (30km/day)',v: 'foot',p:"c"},
	 {l: 'Oxcart (12km/day)',v: 'oxcart',p:"c"},
	 {l: 'Porter (30km/day)',v: 'porter',p:"c"},
	 {l: 'Horse (56km/day)',v: 'donkey',p:"c"},
	 {l: 'Private (36km/day)',v: 'privateroutine',p:"c"},
	 {l: 'Private (50km/day)',v: 'privateaccelerated',p:"c"},
	 {l: 'Fast Carriage (67km/day)',v: 'fastcarriage',p:"c"},
	 {l: 'Horse Relay (250km/day)',v: 'horserelay',p:"c"},
	 {l: 'Rapid Military March (60km/day)',v: 'rapidmarch',p:"c"},
	 {l: 'Donkey',v: 'donkey',p:"c"},
	 {l: 'Wagon', v:'wagon',p:"c"},
	 {l: 'Passenger', v:'carriage',p:"c"}])
  .enter()
  .append("option")
  .html(function(d) {return d.l})
  .attr("value", function(d,i) {return d.v})
  
  document.getElementById("sourceSelectButton").value = 50327;
  document.getElementById("targetSelectButton").value = 50550;

}

function zoomComplete() {
  
  d3.selectAll(".results").style("display", "block")
  d3.selectAll(".routes")
      .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")")
      .style("stroke", function(d) {return d.properties.fixedColor})
      .style("stroke-width", function(d) {return scaled(d.properties.fixedWidth)})

  d3.selectAll(".results")
      .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")")
      .style("stroke-width", scaled(4));
}

function zoomed() {
    var downloadButton = d3.select("#svgDownload").style("display", "none");

  if (voronoiRunning == true) {
    clearVoronoi();
  }

  d3.selectAll(".results").style("display", "none")
  d3.selectAll(".modal").style("display", "none");
//  d3.selectAll(".results").style("stroke", "white")

	clearTimeout(refreshTimer);
	refreshTimer = setTimeout('zoomComplete()', 100);
	refreshSet++;

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
      .attr("xlink:href", function(d) { return "http://" + ["a", "b", "c", "d"][Math.random() * 4 | 0] + ".tiles.mapbox.com/v3/elijahmeeks.map-ktkeam22/" + d[2] + "/" + d[0] + "/" + d[1] + ".png"; })
      .attr("width", 1)
      .attr("height", 1)
      .attr("x", function(d) { return d[0]; })
      .attr("y", function(d) { return d[1]; });

d3.selectAll("path.hull")
    .style("stroke-width", scaled(10))
    .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")");

d3.select("#sitesG")
    .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")");
  
d3.selectAll(".sitecirc")
    .attr("r", function(d) {return scaled((betweennessScale(d.betweenness)) + 20)});

d3.selectAll(".sitecirctop")
  .attr("id", function(d,i) {return "sct" + d.id})
  .attr("r", function(d) {return scaled((betweennessScale(d.betweenness)) + 16)})
  .attr("cx", scaled(-2))
  .attr("cy", scaled(-2));

d3.selectAll(".slabel")
  .attr("x", scaled(2))
  .attr("y", scaled(-60))
  .attr("font-size", scaled(100))
  .style("stroke-width", scaled(25));
  
    d3.selectAll(".routes")
      .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")")
      .style("stroke-width", function(d) {return scaled(2)});
  
}

function colorBy(attribute) {
  resetButtons("routeLabelButton");
  d3.select("#"+attribute+"Button").classed("active", true)
  d3.selectAll(".routes")
  .transition().duration(500).style("stroke", function(d) {return colorRamp(d.properties[attribute])})
}

function colorByType(instant) {
  resetButtons("routeLabelButton");
  d3.select("#tButton").classed("active", true)
  if (!instant) {
  d3.selectAll("path.routes")
  .transition().duration(500).style("stroke", function(d) {return typeHash[d.properties.t]})
  }
  else {
  d3.selectAll("path.routes").style("stroke", function(d) {return typeHash[d.properties.t]})    
  }
}
function siteClick(d,i) {
  this.parentNode.appendChild(this);
  d3.event.stopPropagation();
  var coords = d3.mouse(document.body);
  var modalContents = d3.select("#sitemodal").style("display", "block").style("left", (coords[0] + 20) + "px").style("top", (coords[1] - 20) + "px").html('')
  
  modalContents.append("p").html(d.label)
    modalContents.append("p").attr("id","showLabelButton").style("display","none").html("<button onclick='siteLabel(\"site_g_"+d.id+"\")'>Display Label</button>")
    modalContents.append("p").attr("id","hideLabelButton").style("display","none").html("<button onclick='removeSiteLabel(\"site_g_"+d.id+"\")'>Remove Label</button>")

  if (d3.select("#site_g_"+d.id).selectAll("text").empty()) {
    d3.select("#showLabelButton").style("display","block")
  }
  else {
    d3.select("#hideLabelButton").style("display","block")
  }
  modalContents.append("p").html("<button id='incExcButton'>" + (excludedSites.indexOf(d.id) > -1 ? "Include Site" : "Exclude Site") + "</button>").on("click", function() {onOffSite(d)})
  modalContents.append("p").html("<button onclick='d3.select(this).remove();cartogram("+d.id+")'>Cartogram</button>")
  modalContents.append("p").html("<button onclick='d3.select(this).remove();geoSankey("+d.id+")'>Minard Diagram</button>")
  var costList = modalContents.append("ol")
  costList.selectAll("li").data(d.cost).enter().append("li").html(function(p) {return p});
}

function siteOver(d,i) {
//  d3.select("#site_g_"+d.id+"_label").transition().duration(500).style("stroke-width", scaled(75))
  
  d3.select("#site_g_"+d.id).append('text').attr("class","hoverlabel").text(d.label)
  .attr("x", scaled(2))
  .attr("y", scaled(-60))
  .attr("font-size", scaled(100))
  .attr("text-anchor", "middle")
  .style("stroke-width", scaled(25))
  .style("stroke", "white")
  .style("opacity", .75)
  .style("pointer-events","none");
  d3.select("#site_g_"+d.id).append('text').attr("class","hoverlabel").text(d.label)
  .attr("x", scaled(2))
  .attr("y", scaled(-60))
  .attr("font-size", scaled(100))
  .attr("text-anchor", "middle")
  .style("pointer-events","none")
  .style("stroke", "none");
}

function siteOut(d,i) {
//  d3.select("#site_g_"+d.id+"_label").transition().duration(500).style("stroke-width", scaled(25));
  d3.selectAll(".hoverlabel").remove();
}

function siteLabel(siteID) {
  d3.select("#showLabelButton").style("display","none")
  d3.select("#hideLabelButton").style("display","block")
  d3.select("#"+siteID).append('text').attr("class","slabel").text(function(d) {return d.label})
  .attr("x", scaled(2))
  .attr("y", scaled(-60))
  .attr("font-size", scaled(100))
  .attr("text-anchor", "middle")
  .attr("id", siteID + "_label")
  .style("stroke-width", scaled(25))
  .style("stroke", "white")
  .style("opacity", .75)
  .style("pointer-events","none");
  d3.select("#"+siteID).append('text').attr("class","slabel").text(function(d) {return d.label})
  .attr("x", scaled(2))
  .attr("y", scaled(-60))
  .attr("font-size", scaled(100))
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

function cartogram(centerID) {
  
  var centerX = siteHash[centerID].x;
  var centerY = siteHash[centerID].y;
  
  var newSettings = getSettings();
  newSettings["centerID"] = centerID;
  cartogramsRun.push(newSettings)
  
//  cartoQuery = "new_carto.php?v="+newSettings.vehicle+"&m="+newSettings.month+"&c="+centerID+"&tc="+newSettings.transfer+"&p="+newSettings.priority+"&ml="+newSettings.modes+"&el="+newSettings.excluded+"&d="+newSettings.direction;

  d3.csv(cartoQuery, function(error,cartoData) {

  exposedCarto = cartoData;

  for (x in exposedsites) {
    if(exposedsites[x]) {
      for (y in cartoData) {
        if (cartoData[y].target == exposedsites[x].id) {
          exposedsites[x].cost.push(parseFloat(cartoData[y].cost));
          break;
        }
      }
    }
  }
  
  runCarto(centerX,centerY,centerID, cartogramsRun.length - 1);

  addCartoRow(newSettings);

  })


}

function updateSiteLegend() {
  d3.selectAll(".sitecirctop").filter(function(d) {return d["cost"][lastCartoRan] >= 0}).style("fill", function(d) {return cartoLegend.scale(d["cost"][lastCartoRan])})
}

function runCarto(centerX,centerY,centerID, cartoPosition) {
    lastCartoRan = cartoPosition;

d3.selectAll(".routes").filter(function(el) {return el.properties.source == undefined || el.properties.target == undefined ? this : null}).remove();

  d3.select("#sitemodal").style("display", "none");
  d3.select("#hullButton").style("display","none");
  
  cartogramRunning = true;

  max = d3.max(exposedsites, function(el) {return el["cost"][cartoPosition]});
  mid = max / 2;

//  var colorramp=d3.scale.linear().domain([-1,0,0.01,mid,max]).range(["lightgray","cyan","#7e8fc3","#c28711","#ad5041"]);
  cartoRamp=d3.scale.quantize().domain([0,max]).range(colorbrewer.Spectral[8]);
  var costramp=d3.scale.linear().domain([0,max]).range([0,1]);

  d3.selectAll("g.legend").remove();
  cartoLegend = d3.svg.legend().units(priorityName[cartogramsRun[cartoPosition].priority]).cellWidth(80).cellHeight(25).inputScale(cartoRamp).cellStepping(max / 50);
  d3.select('#legendmodal').style('display','block').classed("horizontal", false);
  d3.select("#legendSVG").append("g").attr("transform", "translate(0,30)").attr("class", "legend").call(cartoLegend);

  d3.select("g.legend").selectAll("g")
  .on("mouseover", function (d) {d3.selectAll("g.Voronoi")
      .filter(function (p) {return p.color == d.color}).style("opacity", 1);
  })
  .on("mouseout", function () {d3.selectAll("g.Voronoi").style("opacity", .8);
  })
  ;
    
  d3.selectAll("g.site").style("display", function(d) {return d.cost[cartoPosition] == -1 ? "none" : "block"})
  d3.selectAll("path.links").style("display", function(d) {return d.properties.source.cost[cartoPosition] == -1 || d.properties.target.cost[cartoPosition] == -1 ? "none" : "block"})
  
  var minX = d3.min(exposedsites, function(el) {return projection([el.x,el.y])[0]})
  var maxX = d3.max(exposedsites, function(el) {return projection([el.x,el.y])[0]})
  var minY = d3.min(exposedsites, function(el) {return projection([el.x,el.y])[1]})
  var maxY = d3.max(exposedsites, function(el) {return projection([el.x,el.y])[1]})
  var xramp=d3.scale.linear().domain([minX,maxX]).range([0,960]);
  var yramp=d3.scale.linear().domain([minY,maxY]).range([0,960]);
  var costramp=d3.scale.linear().domain([0,max]).range([0,1000]);

    function findx(costin, thisx, thisy, cenx, ceny)
  {
    var projectedCoordsThis = projection([thisx,thisy]);
    var projectedCoordsCen = projection([cenx,ceny]);
    var xdiff = xramp(projectedCoordsThis[0]) - xramp(projectedCoordsCen[0]) + .00001;
    var ydiff = yramp(projectedCoordsThis[1]) - yramp(projectedCoordsCen[1]) + .00001;		
    var hypotenuse = Math.sqrt((Math.pow(xdiff,2)) + (Math.pow(ydiff,2)));
    var ratio = costramp(costin) / hypotenuse;
    return (ratio * xdiff * .0001) + projectedCoordsCen[0];
  }

  function findy(costin, thisx, thisy, cenx, ceny) {
    var projectedCoordsThis = projection([thisx,thisy]);
    var projectedCoordsCen = projection([cenx,ceny]);
    var xdiff = xramp(projectedCoordsThis[0]) - xramp(projectedCoordsCen[0]) + .00001;
    var ydiff = yramp(projectedCoordsThis[1]) - yramp(projectedCoordsCen[1]) + .00001;		
    var hypotenuse = Math.sqrt(Math.pow(xdiff,2) + Math.pow(ydiff,2));
    var ratio = costramp(costin) / hypotenuse;
    return (ratio * ydiff * .0001) + projectedCoordsCen[1];
  }

  svg.selectAll("g.site")
  .each(function(d) {
    d.cartoTranslate = "translate("+ (findx(d["cost"][cartoPosition],d.x,d.y,centerX,centerY))  + "," + (findy(d["cost"][cartoPosition],d.x,d.y,centerX,centerY)) + ")scale(.159)";
  })

  d3.select("#rasterG").transition().duration(3000).style("opacity", .5);
  d3.selectAll("path.links").each(function(d) {
    var xposition = -1;
    var yposition = -1;
  var lineLength = d.coordinates.length - 1;
  var cartoRamp = d3.scale.linear().range([d.properties.source["cost"][cartoPosition],d.properties.target["cost"][cartoPosition]]).domain([0, lineLength]);
  d.cartocoords = d.coordinates.map(function(d,i) {return [findx(cartoRamp(i),d[0],d[1],centerX,centerY),findy(cartoRamp(i),d[0],d[1],centerX,centerY)]});
  cartoPath =
  d3.svg.line()
  .x(function(p) {return p[0]})
  .y(function(p) {return p[1]});
  
  d.cartoD = cartoPath(d.cartocoords);
  })

    svg.selectAll("g.site")
  .transition()
  .duration(3000)
  .attr("transform", function(d) {return d.cartoTranslate;});

  svg.selectAll(".sitecirctop")
  .transition()
  .duration(3000)
  .style("fill", function(d) { return (cartoRamp(d["cost"][cartoPosition]))});
  
  d3.selectAll(".links").transition().duration(3000).attr("d", function(d) {return (d.cartoD ? d.cartoD : "")})

}

function cartogramOff() {
  
  d3.selectAll("g.legendRing").remove();
  d3.select("#sitemodal").style("display", "none");
  cartogramRunning = false;
  d3.select("#rasterG").transition().duration(3000).style("opacity", 1);

  d3.selectAll("g.site").filter(function(d) {return d.cost[lastCartoRan] == -1 ? this : null}).select(".sitecirctop").style("fill", "lightgray")

  d3.selectAll("g.site")
  .style("display", "block")
  .transition()
  .duration(3000)
  .attr("transform", function(d) {return "translate(" + projection([d.x,d.y]) + ")scale(" + projection.scale() + ")"})
  .each(function(d) {
    d.cartoTranslate = "translate(" + projection([d.x,d.y]) + ")scale(" + projection.scale() + ")";
  });

  d3.selectAll("path.links")
  .style("display", "block")
  .transition()
  .duration(3000)
  .attr("d", path)

  zoomed();
}

function calculateRoute() {
  var newSettings = getSettings();
  routesRun.splice(0,0,newSettings)

//  routeQuery = "new_route.php?v="+newSettings.vehicle+"&m="+newSettings.month+"&s="+newSettings.source+"&t="+newSettings.target+"&tc="+newSettings.transfer+"&p="+newSettings.priority+"&ml="+newSettings.modes+"&el="+newSettings.excluded;

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
      	var realSource = routeData.features[x].properties.source.toString().length == 6 ? routeData.features[x].properties.source.toString().substring(1,6) : routeData.features[x].properties.source;
	var realTarget = routeData.features[x].properties.target.toString().length == 6 ? routeData.features[x].properties.target.toString().substring(1,6) : routeData.features[x].properties.target;
	
      routeData.features[x].properties.source = siteHash[realSource];
      routeData.features[x].properties.target = siteHash[realTarget];
      routeData.features[x].geometry.source = siteHash[realSource];
      routeData.features[x].geometry.target = siteHash[realTarget];
      routeData.features[x].coordinates = routeData.features[x].geometry.coordinates;
      routeSegments.push(routeData.features[x])
    }

  d3.select("#routesContainer").style("opacity", .2);
  
  svg.selectAll("path.results")
    .data(routeSegments, function(d) {return d.properties.routeID + "_" + d.properties.segment_id})
    .enter()
    .insert("path", "#sitesG")
    .attr("d", path)
    .attr("class", "results links")
    .style("stroke", function(d) {return typeHash[d.properties.segment_type]})
    .style("stroke-width", 4)
    .style("opacity", 0)
    .style("cursor", "pointer")
    .on("click", routeClick)
  .on("mouseover", resultsOver)
  .on("mouseout", resultsOut)
  .style("opacity", 1)

    zoomed();
    
    populateRouteDialogue(newSettings.source,newSettings.target,currentRoute - 1);
    
    for (x in exposedsites) {
      exposedsites[x].betweenness = 0;
    }
    for (x in exposedsites) {
      for (y in routeSegments) {
	var realTarget = routeSegments[y].properties.target.toString().length == 6 ? routeSegments[y].properties.target.toString().substring(1,6) : routeSegments[y].properties.target;
	if (exposedsites[x].id == routeSegments[y].properties.source.id || exposedsites[x].id == routeSegments[y].properties.target.id) {
	  exposedsites[x].betweenness++;
	}
      }
    }


    var maxBetweenness = d3.max(exposedsites, function (d) {return d.betweenness});
    betweennessScale.domain([0,1,maxBetweenness])

    addRouteRow(newSettings, routeData)
  })
}

function getSettings() {

  var sourceID = document.getElementById("sourceSelectButton").value;
  var targetID = document.getElementById("targetSelectButton").value;
  var monthID = d3.selectAll("#monthPicker > input").filter(function() {return d3.select(this).property("checked") ? this : null}).attr("value");
  var priority = d3.select("#priorityForm > input:checked").node().value;

  var modeList = '';
  var modeArray = updateBGRoutes();
  var cartoDirection = 0;

  var monthID = d3.selectAll("#monthPicker > input").filter(function() {return d3.select(this).property("checked") ? this : null}).attr("value");
  var cartoDirection = d3.selectAll("#directionPicker > input").filter(function() {return d3.select(this).property("checked") ? this : null}).attr("value");

  var vehicleType = document.getElementById("vehicleSelectButton").value;
  var transferCost = parseFloat(document.getElementById("transferCost").value);
  isNaN(transferCost) ? transferCost = 0 : null;
  
  modeArray.push("self","ferry","transferc","transferf","transfero","transferr");

  modeList = modeArray.join("");
  
  var excludedIDs = excludedSites.toString();
  settingsID++;
 return {id: settingsID, modes: modeList, modeArr: modeArray, source: sourceID, target: targetID, month: monthID, priority: priority, vehicle: vehicleType, transfer: transferCost, excluded: excludedIDs, direction: cartoDirection}
  
}

function routeClick(d,i) {
  d3.select('#routesContainer').style('opacity', .2);
  d3.event.stopPropagation();
  var coords = d3.mouse(document.body);
  var modalContents = d3.select("#sitemodal").style("display", "block").style("left", (coords[0] + 20) + "px").style("top", (coords[1] - 20) + "px").html('')
  modalContents.append("p").html(d.properties.segment_type + " route from " + d.properties.source.label + " to " + d.properties.target.label)
  modalContents.append("p").html("Duration: " + d.properties.segmentduration);
  modalContents.append("p").html("Length: " + d.properties.segmentlength);
  modalContents.append("p").html("Expense (D): " + d.properties.segmentexpense_d);
  modalContents.append("p").html("Expense (W): " + d.properties.segmentexpense_w);
  modalContents.append("p").html("Expense (C): " + d.properties.segmentexpense_c);
  populateRouteDialogue(routesRun[d.properties.routeID].source,routesRun[d.properties.routeID].target,d.properties.routeID);
  d3.select(this).style("stroke", "red")

}

function idToLabel(inID) {
  //Trim the meta-nodes such that they have the IDs of their parent nodes
  //We can do this easily because metanodes are 1 character longer than normal nodes
  return siteHash[parseInt(inID.toString().length == 6 ? inID.toString().substring(1,6) : inID)].label;
  
}

function populateRouteDialogue(inSource,inTarget,inRouteID) {
  
  inSource = idToLabel(inSource);
  inTarget = idToLabel(inTarget);

  d3.selectAll(".results")
  .style("stroke-width", function(d) {return (d.properties.routeID == inRouteID ? (3 / zoom.scale()) : (9 / zoom.scale())) + "px"})
//  .style("stroke-width", function(d) {return (d.properties.routeID == inRouteID ? 3 : 9 ) + "px"})
  .style("stroke", function(d) {return d.properties.routeID == inRouteID ? "black" : "white"})

  drawTimeline(d3.selectAll(".results").filter(function(d) {return d.properties.routeID == inRouteID}))
  
  var routeModalContents = d3.select("#routeResults").style("display", "block").style("padding", "0").style("width", "0px").html('')
  var segmentNumber = routeSegments.filter(function (el) {return el.properties.routeID == inRouteID}).length;
  var durationSum = d3.sum(routeSegments.filter(function (el) {return el.properties.routeID == inRouteID}), function (p,q) {return p.properties.segmentduration})
  var lengthSum = d3.sum(routeSegments.filter(function (el) {return el.properties.routeID == inRouteID}), function (p,q) {return p.properties.segmentlength})
  var expCSum = d3.sum(routeSegments.filter(function (el) {return el.properties.routeID == inRouteID}), function (p,q) {return p.properties.segmentexpense_c})
  var expDSum = d3.sum(routeSegments.filter(function (el) {return el.properties.routeID == inRouteID}), function (p,q) {return p.properties.segmentexpense_d})
  var expWSum = d3.sum(routeSegments.filter(function (el) {return el.properties.routeID == inRouteID}), function (p,q) {return p.properties.segmentexpense_w})
  
  routeModalContents.append("p").html("From " + inSource + " to " + inTarget)
  routeModalContents.append("p").html("There are " + segmentNumber + " segments (including transfers) for a total length of " +Math.floor(lengthSum) + "km")
  routeModalContents.append("p").html("The trip would last " + d3.round(durationSum,3) + " days")
  routeModalContents.append("p").html("Transport of 1kg of grain would have cost:")
  routeModalContents.append("p").html(" * " + d3.round(expDSum,3) + " by donkey")
  routeModalContents.append("p").html(" * " + d3.round(expWSum,3) + " by wagon")
  routeModalContents.append("p").html("" + d3.round(expCSum,3) + " per passenger")
  
  routeModalContents.transition().duration(750).style("padding", "0 20px").style("width", "400px")
}

function onOffSite(d, forceChange) {
  if (excludedSites.indexOf(d.id) > -1 && forceChange != "off") {
    d3.select("#sct" + d.id).style("opacity", 1)
    excludedSites = excludedSites.filter(function (el) {return el != d.id && el.length == 5})
    d3.select("#incExcButton").html("Exclude Site")
  }
  else if (excludedSites.indexOf(d.id) == -1 && forceChange != "on") {
    d3.select("#sct" + d.id).style("opacity", .5)
    excludedSites.push("" +d.id+ "")
    //We also need to exclude the meta nodes that act as transfer points
    excludedSites.push("1" +d.id+ "")
    excludedSites.push("2" +d.id+ "")
    excludedSites.push("3" +d.id+ "")
    excludedSites.push("4" +d.id+ "")
    d3.select("#incExcButton").html("Include Site")
  }
}

function clusterSitesUI() {  
  d3.select("#clustermodal").style("display", "block").style("left", "200px").style("top", "200px");
  var modalContents = d3.select("#clustercontent").html('');
  modalContents.append("h2").html("Cluster Settings")
  modalContents.append("p").html("Clustering will label the sites to indicate which cartogram center is closest according to the cartograms you've run. You can only cluster based on the same priority.")
  
  if(cartogramsRun.length == 0) {
    modalContents.append("p").style("font-weight", 600).html("You have not run any cartograms. For clustering to be available, you need to run some cartograms by clicking on a site and clicking the Cartogram button.");
    return;
  }
  
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
  .html(function(d) {return siteHash[d.centerID].label + " via " + d.vehicle + " in " + monthNames[d.month]})

  aCLI.append("input")
  .attr("type", "checkbox")
  .attr("class", "cartoOpt")
  .attr("value", function(d,i) {return i});


  d3.selectAll(".availCartos")
  .style("display", function(p,q) {return 0 == p.priority ? "block" : "none"})
  
  var clusterControls = modalContents.append("p");
  clusterControls.append("button").on("click", clusterSites).html("Cluster")
  clusterControls.append("span").html("Frontier Tolerance");
  clusterControls.append("textarea").attr("id", "frontier").style("resize", "none").style("height", "20px").style("margin-left", "20px").style("width", "30px").html("1.0");
  clusterControls.append("img").attr("class", "helpicon").attr("src", "helpq.png").attr("data", "voronoi").on("click", function() {contextualHelp('frontier')})

  modalContents.append("p").append("button").on("click", exportCartoCSV).html("Export to CSV")
  modalContents.append("p").append("a").attr("id", "downloadButton").style("display", "none").html("Download as CSV")

  d3.selectAll(".cartoOpt")
  .property("checked", function(p,q) {return 0 == p.priority ? true : false})
}

function updateClusterUIList () {
  var selectorVal = this.value;
  d3.selectAll(".availCartos")
  .style("display", function(p,q) {return selectorVal == p.priority ? "block" : "none"});
  d3.selectAll(".cartoOpt")
  .property("checked", function(p,q) {return selectorVal == p.priority ? true : false})

}

function clusterSites() {
  activeCentersFull = activeCenter();
  activeCenters = d3.keys(activeCentersFull);
  var frontierSetting = parseFloat(document.getElementById("frontier").value);
  if (activeCenters.length == 0) {
    return;
  }
  
  for (x in exposedsites) {
    if (exposedsites[x]) {
      var maxVal = 1000;
      exposedsites[x].nearestCluster = "disabled";
      for (y in exposedsites[x]["cost"]) {
        if (activeCenters.indexOf(""+y) > -1 && parseInt(exposedsites[x]["cost"][y]) != -1) {
	  var diff = Math.abs(maxVal - parseFloat(exposedsites[x]["cost"][y]));
	  var larger = Math.max(maxVal, parseFloat(exposedsites[x]["cost"][y]));
	  var smaller = Math.min(maxVal, parseFloat(exposedsites[x]["cost"][y]));
	  if (frontierSetting < 1 && frontierSetting * larger < smaller) {
	    exposedsites[x]["nearestCluster"] = "frontier";
	  }
	  else if (parseFloat(exposedsites[x]["cost"][y]) < maxVal) {
            exposedsites[x]["nearestCluster"] = directionHash[activeCentersFull[y].direction]+"-"+siteHash[activeCentersFull[y].centerID].label;
            maxVal = parseFloat(exposedsites[x]["cost"][y]);
	  }
        }
      }
    }
  }
  
  var cartoKeys = d3.set(exposedsites.map(function(el) {return el.nearestCluster})).values();
  
  cartoKeys.splice(0,0,"frontier");

  var clusterNumber = cartogramsRun.length;

  clusterOrdinal = d3.scale.category20().domain(cartoKeys);

  cartoLegend = d3.svg.legend().labelFormat("none").cellPadding(5).orientation("vertical").units("Cluster").cellWidth(50).cellHeight(35).inputScale(clusterOrdinal).cellStepping(10);
  d3.selectAll("g.legend").remove();
  d3.select('#legendmodal').style('display','block').classed("horizontal", true);
  d3.select("#legendSVG").append("g").attr("transform", "translate(30,30)").attr("class", "legend").call(cartoLegend);
  
    svg.selectAll(".sitecirctop")
  .transition()
  .duration(3000)
  .style("fill", function(d) { return clusterOrdinal(d["nearestCluster"])})
  .style("stroke-width", "2px");

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

function closeTimelineTray() {
  var toLeft = document.body.clientWidth - 40;
  if (parseInt(d3.select("#timelineViz").style("left")) < -100) {
    toLeft = 0;
  }
  d3.select("#timelineViz").transition().duration(500).style("left", (-toLeft) + "px")
}

function fullscreenMap() {
  d3.selectAll(".controlsDiv").style("display", "none")
  d3.select("#restoreButton").style("display", "block")
}

function restoreControlsMap() {
  d3.selectAll(".controlsDiv").style("display", "block")
  d3.select("#restoreButton").style("display", "none")
}

function tutorial(step) {
  var leftVal = "", rightVal = "", topVal = "", arrowVal = "", nextStep = "";
  switch(step) {
    case 1:
      topVal = "137px";
      leftVal = "10px";
      rightVal = "";
      arrowVal = "20px";
      nextStep = "Selecting a Month"
      newContent = "<p>To calculate a route, select a source and destination for your route.</p>"
    break;
    case 2:
      topVal = "250px";
      leftVal = "10px";
      rightVal = "";
      arrowVal = "20px";
      nextStep = "Setting a Priority"
      newContent = "<p>Route cost and availability can change depending on time of year. Sea routes adjust or are unavailable due to changing wind patterns and high altitude roads can be inaccessible during the winter.</p>"
    break;
    case 3:
      topVal = "300px";
      leftVal = "10px";
      rightVal = "";
      arrowVal = "20px";
      nextStep = "Selecting Modes";
      newContent = "<p>There are three possible priorities to determine the least cost path. <ul><li>'Fastest' bases the calculation off the amount of time travel takes.</li><li>'Cheapest' routes are calculated based on cost to ship grain or a passenger.</li><li>'Shortest' routes are determined solely on the length of the routes.</li></ul></p>";
    break;
    case 4:
      topVal = "370px";
      leftVal = "10px";
      rightVal = "";
      arrowVal = "20px";
      nextStep = "Changing Maritime Options"
      newContent = "<p>You can activate and deactivate different modes of travel by clicking these buttons to customize your route further. Some sites are inaccessible with certain modes turned off, such as islands with sea routes turned off.</p>"
    break;
    case 5:
      topVal = "415px";
      leftVal = "10px";
      rightVal = "";
      arrowVal = "20px";
      nextStep = "Selecting Vehicle Type"
      newContent = "<p>Rivers and sea routes are modeled in ORBIS using two different sets of assumptions for each type. For rivers, there is a 'Civilian' and 'Military' option, and the latter affords greater upstream speed to simulate rowing. For sea routes, there are two different modeled ships, a faster and a slower one, that have different speeds and slightly different paths.</p>"
    break;
    case 6:
      topVal = "475px";
      leftVal = "10px";
      rightVal = "";
      arrowVal = "20px";
      nextStep = "Transfer Cost"
      newContent = "<p>Your method of travel is going to affect speed (based entirely on the listed rate of km/day) and price to ship grain (by cart or by donkey/porter) or the price to transport a passenger (by carriage).</p><p>You can see dramatic differences in paths, cost, and travel time by varying the method of travel.</p>"
    break;
    case 7:
      topVal = "500px";
      leftVal = "10px";
      rightVal = "";
      arrowVal = "92px";
      nextStep = "Advanced Options"
      newContent = "<p>Transfer cost is the number of days it takes to switch from one mode to another, so a cost of 0.5 would add half a day to any change from road to river or sea route to road and so on. This friction can also dramatically change routes if high enough.</p>"
    break;
    case 8:
      topVal = "525px";
      leftVal = "10px";
      rightVal = "";
      arrowVal = "140px";
      nextStep = "Calculate Route"
      newContent = "<p>Advanced options are currently not supported, but will allow you to set all the values explicitly, such as setting a speed of 27km/day or a cost of 2d/100km of road.</p>"
    break;
    case 9:
      topVal = "565px";
      leftVal = "10px";
      rightVal = "";
      arrowVal = "40px";
      nextStep = "Examining the Network"
      newContent = "<p>Click here to see your route on the map.</p>"
    break;
    case 10:
      topVal = "415px";
      leftVal = "";
      rightVal = "10px";
      arrowVal = "240px";
      nextStep = "Site Options"
      newContent = "<p>ORBIS is based on a network model that simulates travel as a set of network connections between sites with varying length, economic cost, and duration. All route-finding websites do this, but it's particularly important to show the model underpinning a scholarly work like this. You can see the different types of routes available and their spectrum of expense and duration by clicking the buttons above.</p>"
    break;
    case 11:
      topVal = "60%";
      leftVal = "40%";
      rightVal = "";
      arrowVal = "45%";
      nextStep = "Exclude/Include Site"
      newContent = "<p>Clicking on any site (the red circles on the map) will provide you with options for adjusting the model, labeling sites, or running cartograms.</p>"
    break;
    case 12:
      topVal = "60%";
      leftVal = "40%";
      rightVal = "";
      arrowVal = "45%";
      nextStep = "Calculate Cartogram"
      newContent = "<p>Clicking 'Exclude' will make this site and any connections to it be ignored when calculating routes and cartograms. Clicking 'Include' will restore the site's availability to the model.</p>"
    break;
    case 13:
      topVal = "20%";
      leftVal = "40%";
      rightVal = "";
      arrowVal = "45%";
      nextStep = "Recently Run Routes"
      newContent = "<p>Calculating a cartogram distorts the geography of the Roman World from the site selected, so that distance is based on the expense or time taken to travel from that point to any other point modeled in ORBIS. If you click on sites after running a cartogram, you can see the cost (in time, money, or distance) of each site based on the cartograms you've run. You can reset the distorted map to traditional geographic representation by clicking 'Reset Map'.</p><p>After running cartograms, you can 'Cluster' sites to see which are closer to each center of each cartogram. Once you've clustered them, you can click 'Borders' to draw a polygon around these clusters.</p>"
    break;
    case 13:
      topVal = "165px";
      leftVal = "";
      rightVal = "10px";
      arrowVal = "240px";
      nextStep = "Recently Run Cartograms"
      newContent = "<p>Clicking this button will show you a table of the routes that you've calculated.</p>"
    break;
    case 14:
      topVal = "165px";
      leftVal = "";
      rightVal = "10px";
      arrowVal = "180px";
      nextStep = "End the Tutorial"
      newContent = "<p>Clicking this button will show you a table of the cartograms that you've calculated.</p>"
    break;
    case 15:
      d3.select("tutorialpopup").style("display", "none");
      return;
    break;
    
    
  }
  
  newContent += "<p>Close this tutorial by clicking X or go on to <a href='#' onclick='tutorial("+(step+1)+")'>"+nextStep+"</a></p>";  
  d3.select("#tutorialpopup").style("top", topVal).style("left", leftVal).style("right", rightVal)
  d3.select("#tutorialarrow").style("left", arrowVal)
  d3.select("#tutorialcontent").html(newContent)

}

tut = function() {
  this.randomSourceTarget = function randomSourceTarget() {
  }
}

function addCartoRow(cartoSettings) {
  
  var newCartoRow = d3.select("#recentList").append("div")
  .style("background", "white")
  .style("border", "1px lightgray solid")
  .style("width", "500px")
  .style("height", "180px")
  .style("margin-bottom", "10px")
  .style("padding", "10px")
  .attr("class", "cartoRow resultsRow")

  var newCartoGrid = d3.select("#recentGrid").append("div")
  .style("background", "white")
  .style("border", "1px lightgray solid")
  .style("width", "140px")
  .style("height", "140px")
  .style("margin", "10px")
  .style("padding", "5px")
  .style("float", "left")
  .style("position", "relative")
  .attr("class", "cartoRow resultsRow")

  canvas = newCartoRow.append("canvas")
  .style("background", "white").style("border", "black 1px solid").attr("height", 1000).attr("width", 1000)
  .attr("id", "newCanvas");
  
  context = canvas.node().getContext("2d");
  
  var max = d3.max(exposedsites, function(p) {return parseFloat(p["cost"][0])});
  var mid = max / 2;

//  var colorramp=d3.scale.linear().domain([-1,0,0.01,mid,max]).range(["lightgray","cyan","#7e8fc3","#c28711","#ad5041"]);
  var colorramp = d3.scale.quantize().domain([0,max]).range(colorbrewer.Spectral[6]);
  var costramp=d3.scale.linear().domain([0,max]).range([0,1]);

  var sMaxA = d3.max(exposedsites, function (el) {return d3.transform(el.cartoTranslate).translate[0]});
  var sMaxB = d3.max(exposedsites, function (el) {return d3.transform(el.cartoTranslate).translate[1]});
  var sMinA = d3.min(exposedsites, function (el) {return d3.transform(el.cartoTranslate).translate[0]});
  var sMinB = d3.min(exposedsites, function (el) {return d3.transform(el.cartoTranslate).translate[1]});
  
  context.beginPath();
  context.rect(0, 0, 1000, 1000);
  context.fillStyle = 'white';
  context.fill();
  context.lineWidth = 1;
  context.strokeStyle = 'black';
  context.stroke();

  function drX(x) {
    return (x * 4096) + 350;
  }
  function drY(y) {
    return (y * 4096) + 1000;
  }
    d3.selectAll("path.links").each(function(d,i) {
    context.strokeStyle = d.properties.fixedColor;
    context.beginPath();
      var vC = d.cartocoords;
    context.moveTo(drX(vC[0][0]),drY(vC[0][1]));
      var x = 1;
      while (x < vC.length) {
	context.lineTo(drX(vC[x][0]),drY(vC[x][1]));
	x++;
      }
      context.stroke();
    })
    d3.selectAll("g.site").each(function(d,i) {
    var siteCoords = d3.transform(d.cartoTranslate).translate;
    siteCoords[0] = drX(siteCoords[0]);
    siteCoords[1] = drY(siteCoords[1]);
    
    context.strokeStyle = 'black';
    context.fillStyle = colorramp(d.cost[0]);
    context.beginPath();
    context.arc(siteCoords[0],siteCoords[1],5,0,2*Math.PI);
    context.fill();

    if (d3.select(this).select("text").empty() == false) {
    context.lineWidth = 1;
    context.stroke();
    context.font = "11pt Helvetica";
    context.textAlign = 'center';
    context.strokeStyle = "rgba(255, 255, 255, 0.5)";
    context.lineWidth = 3;
    context.strokeText(d.label, siteCoords[0], siteCoords[1] - 8)
    context.fillStyle = 'black';
    context.fillText(d.label, siteCoords[0], siteCoords[1] - 8)
    }
    
  })
  
  var imgUrl = document.getElementById("newCanvas").toDataURL("image/png");
  var detailsDiv = newCartoRow.append("div").style("float", "left").style("width", "170px");
  detailsDiv.append("img").attr("src", imgUrl).style("width", "170px").style("height", "170px");

  var gridDiv = newCartoGrid.append("div").style("width", "170px");
  gridDiv.append("img").attr("src", imgUrl).style("width", "140px").style("height", "140px")
  .style("cursor", "pointer")
  .attr("onclick", function() {return "runCarto(" + siteHash[cartoSettings.centerID].x + "," + siteHash[cartoSettings.centerID].y + "," + cartoSettings.centerID + "," + (cartogramsRun.length - 1) + ");"})
  newCartoGrid.append("span").style("position", "absolute").style("bottom", "10px")
  .html(siteHash[cartoSettings.centerID].label)
  
  canvas.remove();
  
  formatSettings(cartoSettings, newCartoRow, imgUrl);

}

function addRouteRow(routeSettings, newRoute) {
  
  var newCartoRow = d3.select("#recentList").append("div")
  .style("background", "white")
  .style("border", "1px lightgray solid")
  .style("width", "500px")
  .style("height", "180px")
  .style("margin-bottom", "10px")
  .style("padding", "10px")
  .attr("class", "routeRow resultsRow")

  var newCartoGrid = d3.select("#recentGrid").append("div")
  .style("background", "white")
  .style("border", "1px lightgray solid")
  .style("width", "140px")
  .style("height", "140px")
  .style("margin", "10px")
  .style("padding", "5px")
  .style("float", "left")
  .style("position", "relative")
  .attr("class", "routeRow resultsRow")
  
  canvas = newCartoRow.append("canvas")
  .style("background", "white").style("border", "black 1px solid").attr("height", 700).attr("width", 1000)
  .attr("id", "newCanvas");
    
  var diameter = 500,
    radius = diameter/2;
 
var projection2 = d3.geo.mercator()
    .scale(900)
    .translate([700, 1100])
    .rotate([-26,2,0]);
    
    var path2 = d3.geo.path()
    .projection(projection2);
  
  var land = topojson.feature(exposedroutes, exposedroutes.objects.new_routes)
  var coast = topojson.feature(exposedCoast, exposedCoast.objects.coast)
  context = canvas.node().getContext("2d");

  context.beginPath();
  context.rect(0, 0, 1000, 700);
  context.fillStyle = 'white';
  context.fill();
  context.lineWidth = 1;
  context.strokeStyle = 'black';
  context.stroke();

  context.strokeStyle = "rgba(0, 0, 0, 0.1)";
  context.beginPath(), path2.context(context)(land), context.fill(), context.stroke();

  context.strokeStyle = 'black';
  context.lineWidth = 1;
  context.beginPath(), path2.context(context)(coast), context.stroke();
  
  var drawRoutes = exposedroutes.objects.new_routes.geometries;
  
  context.strokeStyle = 'darkred';
  context.lineWidth = 4;
  context.fillStyle = 'none';
  context.beginPath(), path2.context(context)(newRoute), context.fill(), context.stroke();
  
  d3.selectAll("g.site").filter(function(el) {return d3.select(this).select("text").empty() == false}).select("text")
  .each(function(d,i) {
    var coords = projection2([d.x,d.y])
  context.font = "11pt Helvetica";
  context.textAlign = 'center';
  context.strokeStyle = "rgba(255, 255, 255, 0.5)";
  context.lineWidth = 3;
  context.strokeText(d.label, coords[0], coords[1] - 8)
  context.fillStyle = 'black';
    context.fillText(d.label, coords[0], coords[1] - 8)

  context.beginPath();
  context.arc(coords[0], coords[1],5,0,2*Math.PI);
  context.fill();

    })
  
  var imgUrl = document.getElementById("newCanvas").toDataURL("image/png");
  var detailsDiv = newCartoRow.append("div").style("float", "left").style("width", "170px");
  detailsDiv.append("img").attr("src", imgUrl).style("width", "170px").style("height", "120px");

  var gridDiv = newCartoGrid.append("div").style("width", "140px");
  gridDiv.append("img").attr("src", imgUrl).style("width", "140px").style("height", "100px")
  .style("cursor", "pointer")
  .attr("onclick", function() { return "populateRouteDialogue(" + routeSettings.source + "," + routeSettings.target + "," + (routesRun.length - 1) + ");" })
  ;
  
  newCartoGrid.append("span").style("position", "absolute").style("bottom", "10px")
  .html(siteHash[routeSettings.source].label + " -> " + siteHash[routeSettings.target].label)
    
  canvas.remove();
  
  formatSettings(routeSettings, newCartoRow, imgUrl);

}

function formatSettings(incSettings, targetSelection, imgUrl) {
  exposedSettings = incSettings;
  
  var longLable = incSettings.centerID ? siteHash[incSettings.centerID].label + " Cartogram" : siteHash[incSettings.source].label + " to " + siteHash[incSettings.target].label;
  var da = new Date();
  var dateStamp = da.getMonth + " - " + da.getDate() + " - " + da.getFullYear();

  var annotationDiv = targetSelection.append("div").style("overflow", "hidden").style("padding-left", "10px").style("width", "300px").style("float", "left");

  annotationDiv.append("h3").style("margin-top", 0)
  .html(longLable)


  annotationDiv.append("p").html("Priority: " + incSettings.priority
    + ", Month: " + incSettings.month + ", vehicle: " + incSettings.vehicle + ", transfer cost: " +
    incSettings.transfer + "modes: ");
  annotationDiv.append("button").html("Open in a new tab")
  .on ("click", function () {
  var newPage1 = "<html><head><title>" + longLable + "</title></head><style>div: {width:100%;}</style><body><div><h1>" + longLable + "</div><div><img src='";
  var newPage2 = "' /></div><div><p>Scheidel, W. and Meeks, E. (May 2, 2012). ORBIS: The Stanford Geospatial Network Model of the Roman World. Retrieved " + da.toDateString() + ", from http://orbis.stanford.edu.</div></body></html>";
  
  var opened = window.open("", "_blank");
  window.focus();
  opened.document.write(newPage1 + imgUrl + newPage2);
    
  }
       )
  
  if (incSettings.centerID) {    
      annotationDiv.append("button").html("Redisplay")
      .attr("onclick", function() {return "runCarto(" + siteHash[incSettings.centerID].x + "," + siteHash[incSettings.centerID].y + "," + incSettings.centerID + "," + (cartogramsRun.length - 1) + ");"})
  }
  else {
      annotationDiv.append("button").html("Redisplay")
      .attr("onclick", function() { return "populateRouteDialogue(" + incSettings.source + "," + incSettings.target + "," + (routesRun.length - 1) + ");" })
  }


  
  var newRow = d3.select("#recTableActual").append("tr").attr("class", incSettings.centerID ? "cartoRow resultsRow" : "routeRow resultsRow");

  newRow.append("td").html(siteHash[incSettings.source].label)
  newRow.append("td").html(incSettings.centerID ? "Cartogram" : siteHash[incSettings.target].label)
  newRow.append("td").html(incSettings.priority)
  newRow.append("td").html(incSettings.month)
  newRow.append("td").html(incSettings.vehicle)
  var imgButton = newRow.append("td").append("div")
  .style("width", "90px")
  .style("height", "40px")
  .style("overflow", "hidden")
  .append("img").attr("src", imgUrl)
  .style("cursor", "pointer")
  .style("position", "relative")
  .style("left", "-20px")
  .style("top", incSettings.centerID ? "-20px" : "-10px")
  .style("width", "120px")
  .style("height", incSettings.centerID ? "120px" : "80px")
  
  if (incSettings.centerID) {
      imgButton
      .attr("onclick", function() {return "runCarto(" + siteHash[incSettings.centerID].x + "," + siteHash[incSettings.centerID].y + "," + incSettings.centerID + "," + (cartogramsRun.length - 1) + ");"})
  }
    else {
      imgButton
      .attr("onclick", function() { return "populateRouteDialogue(" + incSettings.source + "," + incSettings.target + "," + (routesRun.length - 1) + ");" })
  }
  
//  var figureDiv = targetSelection.append("div").style("width", "500px").style("overflow", "hidden")
//  figureDiv.append("p").html(JSON.stringify(incSettings))

}

function scaled(incomingNumber) {
  return incomingNumber / zoom.scale();
}

function updateBGRoutes() {
  var activeTypes = [];
  d3.select("#modeForm").selectAll("input:checked").each(function () {
    activeTypes = activeTypes.concat(this.value.split(","));
  })

  d3.selectAll(".routes").style("display", function(d) {return activeTypes.indexOf(d.properties.t) > -1 ? "block" : "none"})

  return activeTypes;
}

function brushed() {
    if (voronoiRunning == true) {
    clearVoronoi();
  }

  d3.select("#infopopup").style("display", "block");
  d3.select("#infocontent").html("<p>You can draw a box to select multiple sites and remove or add them to the network.</p>");
  d3.selectAll(".multiSiteControl").style("display", "inline")
  
  var currentExtent = brush.extent();
  var filteredSelection = d3.selectAll("g.site").filter(function(el) {
    var displayed = d3.select(this).style("display");
    var thisX = (d3.transform(d3.select(this).attr("transform")).translate[0] * zoom.scale()) + zoom.translate()[0];
    var thisY = (d3.transform(d3.select(this).attr("transform")).translate[1] * zoom.scale()) + zoom.translate()[1];
    return displayed != "none" && thisX >= currentExtent[0][0] && thisX <= currentExtent[1][0] && thisY >= currentExtent[0][1] && thisY <= currentExtent[1][1] ? this : null;
  })
  
  d3.selectAll("g.site").select(".sitecirctop").style("fill", "#ad5041")
  
  filteredSelection.select(".sitecirctop").style("fill", "pink")
  
  d3.selectAll("g.changeButton")
  .attr("transform", function(d,i) {return "translate("+currentExtent[1][0]+","+(currentExtent[0][1] + (i *50)) +")"} )

  if (filteredSelection.empty()) {
    d3.selectAll(".multiSiteControl").style("display", "none")    
  }
  else {
    d3.select("#infocontent").append("p").html("" + filteredSelection.size() + " sites selected")
  }
}

function massSiteChange(onOff) {
  var currentExtent = brush.extent();
  var filteredSelection = d3.selectAll("g.site").filter(function(el) {
    var displayed = d3.select(this).style("display");
    var thisX = (d3.transform(d3.select(this).attr("transform")).translate[0] * zoom.scale()) + zoom.translate()[0];
    var thisY = (d3.transform(d3.select(this).attr("transform")).translate[1] * zoom.scale()) + zoom.translate()[1];
    return displayed != "none" && thisX >= currentExtent[0][0] && thisX <= currentExtent[1][0] && thisY >= currentExtent[0][1] && thisY <= currentExtent[1][1] ? this : null;
  })
  if (onOff == "exclude") {
    d3.selectAll("g.site").each(function(d) {onOffSite(d, "on")});
    filteredSelection.each(function(d) {onOffSite(d, "off")});
  }
  else if (onOff == "intersect") {
    d3.selectAll("g.site").each(function(d) {onOffSite(d, "off")});
    filteredSelection.each(function(d) {onOffSite(d, "on")});    
  }
  else if (onOff == "all") {
    d3.selectAll("g.site").each(function(d) {onOffSite(d, "on")});
  }
  else if (onOff == "none") {
    d3.selectAll("g.site").each(function(d) {onOffSite(d, "off")});
  }
  else {
    filteredSelection.each(function(d) {onOffSite(d, onOff)});
  }
}

function startBrushing() {
  d3.select("#startBrushingButton").style("display", "none");
  d3.select("#stopBrushingButton").style("display", "inline");
  d3.select("g.zoom").style("display", "none");
  d3.select("g.brush").style("display", "block");
}

function stopBrushing() {
  d3.select("#startBrushingButton").style("display", "inline");
  d3.select("#stopBrushingButton").style("display", "none");
  d3.select("g.zoom").style("display", "block");
  d3.select("g.brush").style("display", "none");
}

function createVoronoi() {
  zoomed();
  var colorArray = [];
  clippingPolys = [];
  var cPS = zoom.scale() / 80;

  var forVoronoi = [];
  
  d3.selectAll(".sitecirctop")
  .filter(function() {return !cartogramRunning || d3.select(this).style("fill") != "#d3d3d3"})
  .each(function(el) {
    forVoronoi.push(el);
    colorArray.push(d3.select(this).style("fill"));
    var c = [(d3.transform(el.cartoTranslate).translate[0] * zoom.scale()) + zoom.translate()[0], (d3.transform(el.cartoTranslate).translate[1] * zoom.scale()) + zoom.translate()[1]];
    clippingPolys.push([[c[0] - cPS,c[1]],[c[0] -cPS/2,c[1] + cPS],[c[0] + cPS/2,c[1] + cPS],[c[0] + cPS,c[1]],[c[0] + cPS/2,c[1] - cPS],[c[0] - cPS/2,c[1] - cPS]]);
    })
  
  var colorSet = d3.set(colorArray);
  var colorKeys = colorSet.values();
  
  clearVoronoi();
  voronoiRunning = true;
  d3.selectAll("g.site").selectAll("circle").style("display", function(d) { return d.cost[d["nearestCluster"]] == 0 ? "block" : "none"})
  voronoi = d3.geom.voronoi()
  .x(function (el) {return (d3.transform(el.cartoTranslate).translate[0] * zoom.scale()) + zoom.translate()[0];})
  .y(function (el) {return (d3.transform(el.cartoTranslate).translate[1] * zoom.scale()) + zoom.translate()[1];});
    
  vorPolys = voronoi(forVoronoi);
  vorPolys.forEach(function(el,ar) {
    vorPolys[ar] = d3.geom.polygon(vorPolys[ar]).clip(clippingPolys[ar])
    })

  d3.select("#voronoiG").remove();
  d3.select("#mapSVG").insert("g", "#sitesG").attr("id", "voronoiG").selectAll("path.voronoi")
  .data(vorPolys)
  .enter()
  .append("path")
  .style("fill", function(d,i) {return colorArray[i]})
  .attr("d", function (d) {return "M" + d.join("L") + "Z";})
  .attr("class", "voronoi vorDelete")
  .style("opacity", 0)
  .style("display", "none");


  d3.selectAll(".routes")
  .transition().duration(2000).style("stroke", "black") 

  contourPolys = clipVoronoi(colorKeys);
  
  d3.select("#voronoiG").selectAll("g.contours").data(contourPolys).enter().append("g")
  .attr("class", "voronoi")
  .each(function(d) {d3.select(this).selectAll("path.contours").data(d.polys).enter().append("path")
	.style("fill", d.color)
	.style("stroke", d.color)
	.style("stroke-width", "2px")
	.attr("d", function(p) {return "M" + xyToArray(p).join("L") + "Z";})
	})
  	.style("opacity", 0)
	  .on("mouseover", vorOver)
  .on("mouseout", vorOut)
  .transition()
  .duration(1000)
  .style("opacity", 1)
  .transition()
  .duration(1000)
  .style("opacity", .70);

  d3.selectAll(".vorDelete").remove();

  function vorOver(d) {
    d3.selectAll("g.Voronoi")
      .filter(function (p) {return p.color == d.color}).style("opacity", 1);
      var siteNumber = d3.selectAll(".sitecirctop")
      .filter(function (p) {return d3.select(this).style("fill") == d.color}).style("opacity", 1).size();
    
  d3.select("#infopopup").style("display", "block");
  d3.select("#infocontent").html("<p>" + siteNumber + " sites in this region</p>");
  }

  function vorOut(d) {
  d3.selectAll("g.Voronoi").style("opacity", .7);
  d3.select("#infopopup").style("display", "none");
  
  }
  
  function xyToArray(incArray) {
  var newArray = []    
    incArray.forEach(function (el) {
      newArray.push([el.X,el.Y]);
    })
    return newArray;
  }


  if (!cartogramRunning) {
    d3.select("#voronoiG").selectAll("path.coastlines").data(topojson.feature(exposedCoast, exposedCoast.objects.coast).features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", "voronoi")
    .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")")
    .style("fill", "none")
    .style("stroke", "black")
    .style("pointer-events", "none")
    .style("stroke-width", scaled(1))
    ;
  }
  
}

function clearVoronoi() {
  voronoiRunning = false;
  colorByType(true);
  d3.selectAll("g.site").selectAll("circle").style("display", "block")
  d3.selectAll("path.voronoi").remove();
  d3.selectAll("g.voronoi").remove();
  d3.selectAll("clipPath").remove();
}

function clipVoronoi(colorValues) {

  var clipType = ClipperLib.ClipType.ctUnion;
  var fillType = 1;
  
  var contourPolys = [];
  
  colorValues.forEach(function (colorVal) {
  cpr = new ClipperLib.Clipper();
  var vorArray = [];
  var solutionPath = [[]]
  d3.selectAll("path.voronoi").filter(function (el) {return d3.select(this).style("fill") == colorVal})
  .each(function (el) {
  var vorSegs = d3.select(this).node().pathSegList;
  var x = 0;
  var newPathArray = [];
  while (x < vorSegs.numberOfItems) {
    var newPathSegment = {X: parseInt(vorSegs.getItem(x).x), Y: parseInt(vorSegs.getItem(x).y)};
    if (parseInt(vorSegs.getItem(x).x)) {
      newPathArray.push(newPathSegment);
    }
    x++;
  }
  
  vorArray.push(newPathArray);
  })

//  paths = ClipperLib.Clipper.SimplifyPolygons(vorArray, ClipperLib.PolyFillType.pftNonZero);
//  paths = ClipperLib.Clipper.CleanPolygons(paths, 5);
//  paths = ClipperLib.JS.Clean(paths, 5);

    cpr.AddPaths(vorArray, ClipperLib.PolyType.ptSubject, true);
    cpr.AddPaths([vorArray[0]], ClipperLib.PolyType.ptClip, true);
    
    var succeeded = cpr.Execute(clipType, solutionPath, fillType, fillType);
    contourPolys.push({color: colorVal, polys: solutionPath});
  })
  
  return contourPolys;
  
}

function drawTimeline(selectedRoutes) {
  d3.selectAll(".timelineRoutes").remove();
  d3.selectAll("g.timelineSites").remove()
  var timelineRoutes = [];
  d3.select("#timelineViz").selectAll(".tab").classed("backtab", true);
  d3.select("#tlbPerspective").classed("backtab", false);
  
  selectedRoutes.each(function(d) {
    timelineRoutes.push(d);
  })

//  var timelineRoutes = simplifyLines(selectedRoutes)
//  console.log(timelineRoutes)
  
  d3.select("#timelineViz").style("display", "block")
  var canvWidth = parseInt(d3.select("#timelineSVG").style("width"));
  var canvHeight = parseInt(d3.select("#timelineSVG").style("height"));
  var canvMargin = 20;
  
  var xMin = d3.min(timelineRoutes, function(d) {return d3.min(d.coordinates, function(p) {return p[0]})});
  var xMax = d3.max(timelineRoutes, function(d) {return d3.max(d.coordinates, function(p) {return p[0]})});
  var yMin = d3.min(timelineRoutes, function(d) {return d3.min(d.coordinates, function(p) {return p[1]})});
  var yMax = d3.max(timelineRoutes, function(d) {return d3.max(d.coordinates, function(p) {return p[1]})});
  
  var roughXScale = d3.scale.linear().domain([xMin,xMax]).range([(canvMargin * 3), canvWidth - (canvMargin * 3)]);
  var roughDistortedXScale = d3.scale.linear().domain([xMin,xMax]).range([(canvMargin * 3), canvWidth - (canvMargin * 3)]).nice();
  var roughYScale = d3.scale.linear().domain([yMax,yMin]).range([canvMargin, canvHeight - canvMargin]);
/*
  if (yMax - yMin > xMax - xMin) {
  roughXScale = d3.scale.linear().range([canvMargin, canvHeight - canvMargin]);
  roughYScale = d3.scale.linear().range([(canvMargin * 4), canvWidth - (canvMargin * 4)]);
  }
*/
  var roughLineConstructor = d3.svg.line()
  .x(function(d) {return roughXScale(d[0])})
  .y(function(d) {return roughYScale(d[1])});

  var roughDistortedLineConstructor = d3.svg.line()
  .x(function(d) {return roughDistortedXScale(d[0])})
  .y(function(d) {return roughYScale(d[1])});
  
  d3.select("#timelineSVG").selectAll("path.timelineRoutes").data(timelineRoutes).enter().append("path")
  .style("fill", "none")
  .style("stroke", function(d) {return typeHash[d.properties.segment_type]})
  .attr("d", "M1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1L1,1")
  .style("stroke-width", "4px")
  .attr("class", "timelineRoutes")
  .on("mouseover", resultsOver)
  .on("mouseout", resultsOut);
  
  var timelineSites = []
  timelineRoutes.forEach(function (el) {
    if (timelineSites.indexOf(el.properties.source) == -1) {
      timelineSites.push(el.properties.source);
    }
    if (timelineSites.indexOf(el.properties.target) == -1) {
      timelineSites.push(el.properties.target);
    }
  })

  d3.select("#timelineSVG")
  .selectAll("g.timelineSites").data(timelineSites).enter().append("g")
  .attr("class", "timelineSites")
  .on("mouseover", function() {d3.select(this).select("text").style("display", "block")})
  .on("mouseout", function() {d3.select(this).select("text").style("display", "none")});
  
  d3.selectAll("g.timelineSites").append("circle").style("fill", "#ad5041").style("stroke", "black").style("stroke-width", "1px").attr("r", 4);
  
  d3.selectAll("g.timelineSites").append("text").style("pointer-events", "none").style("y", -5).style("display", "none").style("text-anchor", "middle").style("font-weight", 900).text(function(d) {return d.label})
  timelineBy("perspective");
  d3.select("#tlbPerspective").on("click", function() {timelineBy("perspective");})
  d3.select("#tlbDuration").on("click", function() {timelineBy("duration");})
  d3.select("#tlbExpensed").on("click", function() {timelineBy("expensed");})
  d3.select("#tlbExpensew").on("click", function() {timelineBy("expensew");})
  d3.select("#tlbExpensec").on("click", function() {timelineBy("expensec");})
  d3.select("#tlbDistance").on("click", function() {timelineBy("distance");})
  
  function timelineBy(distortionType) {

    if (distortionType == "perspective") {
      roughYScale.range([canvMargin, canvHeight - canvMargin]);
      d3.selectAll("g.timelineSites")
      .transition()
      .duration(1000)
      .attr("transform", function(d) {return "translate(" + roughXScale(d.x) + "," + roughYScale(d.y) + ")"})

     d3.selectAll("path.timelineRoutes")
      .transition()
      .duration(1000)
       .attr("d", function(d) {return roughLineConstructor(d.coordinates)})

      d3.select("#tlXLabel").text("Latitude")
      d3.select("#tlYLabel").text("Longitude")
      
      updateAxis(roughXScale);

       return;
    }
          d3.select("#tlYLabel").text("")
      roughYScale.range([60, 60]);

    
      var totalTime = timelineRoutes.reduce(function(a,b) {return a + b.properties.segmentduration},0);
      var totalLength = timelineRoutes.reduce(function(a,b) {return a + b.properties.segmentlength},0);
      var totalCostD = timelineRoutes.reduce(function(a,b) {return a + b.properties.segmentexpense_d},0);
      var totalCostW = timelineRoutes.reduce(function(a,b) {return a + b.properties.segmentexpense_w},0);
      var totalCostC = timelineRoutes.reduce(function(a,b) {return a + b.properties.segmentexpense_c},0);
    
    if (distortionType == "duration") {
      roughDistortedXScale.domain([0,totalTime]);
      propType = "segmentduration"
      d3.select("#tlXLabel").text("Days")
    }
    if (distortionType == "distance") {
      roughDistortedXScale.domain([0,totalLength]);
      propType = "segmentlength"
      d3.select("#tlXLabel").text("Kilometers") 
     }
    if (distortionType == "expensed") {
      roughDistortedXScale.domain([0,totalCostD]);
      propType = "segmentexpense_d";
      d3.select("#tlXLabel").text("Denaari/kg") 
    }
    if (distortionType == "expensew") {
      roughDistortedXScale.domain([0,totalCostW]);
      propType = "segmentexpense_w";
      d3.select("#tlXLabel").text("Denaari/kg") 
    }
    if (distortionType == "expensec") {
      roughDistortedXScale.domain([0,totalCostC]);
      propType = "segmentexpense_c";
      d3.select("#tlXLabel").text("Denaari/passenger") 
    }
    updateAxis(roughDistortedXScale);

    var steppingPoint = siteHash[routesRun[0].source];
      var currentCost = 0;
      var moreRoutes = true;
      var calculatedRoutes = [];
      var i = 0
      while (moreRoutes && i < 1000) {
	for (x in timelineRoutes) {
//	    console.log(timelineRoutes[x])
	  if (calculatedRoutes.indexOf(timelineRoutes[x]) == -1) {
	    if (timelineRoutes[x].properties.source == timelineRoutes[x].properties.target) {
	      calculatedRoutes.push(timelineRoutes[x]);	      
	    }
	    else if (timelineRoutes[x].properties.source == steppingPoint) {
	      steppingPoint.tlCost = currentCost;
	      currentCost += timelineRoutes[x].properties[propType];
	      steppingPoint = timelineRoutes[x].properties.target;
	      calculatedRoutes.push(timelineRoutes[x]);
	    }
	    else if (timelineRoutes[x].properties.target == steppingPoint) {
	      steppingPoint.tlCost = currentCost;
	      currentCost += timelineRoutes[x].properties[propType];
	      steppingPoint = timelineRoutes[x].properties.source;
	      calculatedRoutes.push(timelineRoutes[x]);
	    }
	  }
	}
	  if (calculatedRoutes.length == timelineRoutes.length) {
	      steppingPoint.tlCost = currentCost;
	    moreRoutes = false;
	  }
	  i++;
      }
      
      d3.selectAll("g.timelineSites")
      .transition()
      .duration(1000)
      .attr("transform", function(d) {return "translate(" + roughDistortedXScale(d.tlCost) + "," + roughYScale(d.y) + ")"});

     d3.selectAll("path.timelineRoutes")
      .transition()
      .duration(1000)
      .attr("d", function(d) {return roughDistortedLineConstructor([[d.properties.source.tlCost,d.properties.source.y],[d.properties.target.tlCost,d.properties.target.y]])})
      return;
    
  }
  function updateAxis(incXScale) {
      var tlXAxis = d3.svg.axis().scale(incXScale).orient("bottom").tickSize(-80).ticks(6).tickSubdivide(true);    
//      var tlYAxis = d3.svg.axis().scale(roughYScale).orient("left").tickSize(10).ticks(3).tickSubdivide(true);  
      d3.select("#tlXAxis").transition().duration(1000).call(tlXAxis);
//      d3.select("#tlYAxis").transition().duration(1000).call(tlYAxis);
      d3.selectAll(".tlAxis").selectAll("path").style("stroke", "none").style("fill", "#FAFAE6").style("opacity", .5)
      d3.selectAll(".tlAxis").selectAll("line").style("stroke", "black").style("stroke-width", "1px")
      d3.selectAll(".tlAxis").selectAll("line.minor").style("stroke", "gray").style("stroke-width", "1px").style("stroke-dasharray", "5 5")
  }
}

function resultsOver(d) {
  d3.selectAll(".timelineRoutes").filter(function(p) {return p.properties.segment_id == d.properties.segment_id}).style("stroke-width", "8px");
  d3.selectAll(".results").filter(function(p) {return p.properties.segment_id == d.properties.segment_id}).style("stroke", "red")
}

function resultsOut(d) {
  d3.selectAll(".timelineRoutes").style("stroke-width", "4px");
  d3.selectAll(".results").filter(function(p) {return p.properties.segment_id == d.properties.segment_id}).style("stroke", "black")
}

function simplifyLines(selectedLines) {
      var simpleGeom = [];
      selectedLines.each(function(d,i) {
      var segLength = d3.select(this).node().getTotalLength();
	var simplifiedObject = {coordinates: [], type:"LineString", id: d.id, properties: d.properties};
      for (x=0;x<=1;x+=.1) {
	var segPoint = d3.select(this).node().getPointAtLength(segLength * x);
	var segPointProjected = projection.invert([segPoint.x,segPoint.y])
	simplifiedObject.coordinates.push([segPointProjected[0],segPointProjected[1]]);	
	}
	simpleGeom.push(simplifiedObject);
	})
      return simpleGeom;
}

function switchControls(switchType) {
    d3.selectAll(".calculateButton").style("display", "none");
  if (switchType == "cartogram") {
    d3.select("#cartoCalculateButton").style("display", "inline");
    d3.select("#targetSelectButton").style("display", "none");
    d3.select("#directionPicker").style("display", "inline");
  }
  else if (switchType == "Minard") {
    d3.select("#sankeyCalculateButton").style("display", "inline");
    d3.select("#targetSelectButton").style("display", "none");
    d3.select("#directionPicker").style("display", "inline");    
  }
  else {
    d3.select("#routeCalculateButton").style("display", "inline");
    d3.select("#targetSelectButton").style("display", "inline")
    d3.select("#directionPicker").style("display", "none");
  }
}

function calculateCarto() {
  cartogram(getSettings().source);
}

function calculateSankey() {
  geoSankey(getSettings().source);
}

function exportCartoCSV() {

  var fullCenters = activeCenter();
  var centers = d3.keys(fullCenters);
  var newPageBegin = "<html><head><title>Exported Cartogram Data</title></head><style>div: {width:100%;}</style><body><pre>";
  var newPageEnd = "</pre></body></html>";
  var newPageContent = '"id","label","x","y","betw","cluster"'
  for (x in cartogramsRun) {
    if (centers.indexOf(""+x) > -1) {
      newPageContent += ',"' + siteHash[cartogramsRun[x].centerID].label + '"';
    }
  }
  newPageContent += "\r";
  
  for (x in exposedsites) {
    newPageContent += exposedsites[x].id + ',"' + exposedsites[x].label + '",' + exposedsites[x].x + ',' + exposedsites[x].y + ',' + exposedsites[x].betweenness + ',' + exposedsites[x].nearestCluster;
    for (y in exposedsites[x].cost) {
      if (centers.indexOf(""+y) > -1) {
	newPageContent += "," + exposedsites[x].cost[y];
      }
    }
    newPageContent += "\r";
  }
  
  var opened = window.open("", "_blank");
  window.focus();
  opened.document.write(newPageBegin + newPageContent + newPageEnd);
  
  window.URL = (window.URL || window.webkitURL);
  

  var downloadButton = d3.select("#downloadButton").style("display", "inline");
  
downloadButton.on("mouseover", function() {
  var url = window.URL.createObjectURL(new Blob([newPageContent], { "type" : "application\/csv" }));

    // Restore non-filtered content.
//    processFiles();

    downloadButton
        .attr("download", "cartogram.csv")
        .attr("href", url)
        .on("mouseout", function(){
          setTimeout(function() {
            window.URL.revokeObjectURL(url);
          }, 10);
        });
  });
}

function exportSVG() {

d3.selectAll("path.links").style("fill", "none");
  var newPageContent = "<svg " + d3.select("#vizContainer").node().innerHTML.split("<svg ")[2]

  window.URL = (window.URL || window.webkitURL);
  
  var downloadButton = d3.select("#svgDownload").style("display", "inline");
  
downloadButton.on("mouseover", function() {
  var url = window.URL.createObjectURL(new Blob([newPageContent], { "type" : "application\/svg" }));

// Restore non-filtered content.
//    processFiles();

    downloadButton
        .attr("download", "orbis.svg")
        .attr("href", url)
        .on("mouseout", function(){
          setTimeout(function() {
            window.URL.revokeObjectURL(url);
          }, 10);
        });
  });
}


function activeCenter() {
  var foundArray = [];
  var indexArray = {};
  d3.selectAll(".cartoOpt").each(function() {this.checked ? foundArray.push(parseInt(this.value)) : null})
  
  for (x in cartogramsRun) {
    if (foundArray.indexOf(parseInt(x)) > -1) {
      indexArray[x] = cartogramsRun[x];
    }
  }
  
  return indexArray;
}

function mapOff(opacSetting) {
  opacSetting = opacSetting || 0;
  if (d3.select("#rasterG").style("opacity") == 1) {
    d3.select("#rasterG").style("opacity", opacSetting);
  }
  else {
    d3.select("#rasterG").style("opacity", 1);    
  }
}

function temporaryLabels() {
  if (d3.selectAll(".hoverlabel").empty()) {
    d3.selectAll("g.site").each(function(d,i) {siteOver(d,i)});
  }
  else {
    d3.selectAll(".hoverlabel").remove();
  }
}

function zoomManual(zoomDirection) {
  var cZoom = zoom.scale();
  if (zoomDirection == "in") {
    zoom.scale(cZoom * 2);
    zoom.translate([zoom.translate()[0] - (zoom.center()[0] /2), zoom.translate()[1] + (zoom.center()[1])])
    console.log(zoom.center())
//    zoom.center([500,500]);
  }
  else {
    zoom.scale(cZoom / 2);
    zoom.translate([zoom.translate()[0] + (zoom.center()[0] /2), zoom.translate()[1] - (zoom.center()[1])])
//    zoom.center([500,500]);
  }
  zoomed();
}

function geoSankey(centerID) {
    var newSettings = getSettings();
  newSettings["centerID"] = centerID;
  sankeyHash = {};

//    minardQuery = "sankey_carto.php?v="+newSettings.vehicle+"&m="+newSettings.month+"&c="+centerID+"&tc="+newSettings.transfer+"&p="+newSettings.priority+"&ml="+newSettings.modes+"&el="+newSettings.excluded+"&d="+newSettings.direction;

  d3.csv(minardQuery, function(error,cartoData) {
    for (x in cartoData) {
      sankeyHash[cartoData[x].source + "-" + cartoData[x].target] = cartoData[x].freq;
      sankeyHash[cartoData[x].target + "-" + cartoData[x].source] = cartoData[x].freq;
    }
    
    freqMax = d3.max(cartoData.filter(function (el) {return el.source != el.target}), function (d) {return parseInt(d.freq)});
    freqScale = d3.scale.linear().domain([1,10,25,50,100,200,freqMax]).range([2,6,10,14,16,20,25]);
    freqColor = d3.scale.linear().domain([1,10,25,50,100,200,freqMax]).range(colorbrewer.Purples[7]);
//    freqScale = d3.scale.linear().domain([1,freqMax]).range([2,20]);
//    freqColor = d3.scale.linear().domain([freqMax,1]).range(["red","blue"]);
    
    d3.selectAll("path.routes").each(
      function(d) {
      var realSource = d.properties.sid.toString().length == 6 ? d.properties.sid.toString().substring(1,6) : d.properties.sid;
      var realTarget = d.properties.tid.toString().length == 6 ? d.properties.tid.toString().substring(1,6) : d.properties.tid;
      if (sankeyHash[realSource+"-"+realTarget]) {
	d.properties.fixedWidth = freqScale(sankeyHash[realSource+"-"+realTarget]);
//	d.fixedColor = freqColor(sankeyHash[realSource+"-"+realTarget]);
  	d.properties.fixedColor = "black";
	d.properties.lastFreq = parseInt(sankeyHash[realSource+"-"+realTarget]);
      }
      else {
	d.properties.fixedWidth = 1;
	d.properties.fixedColor = "none";
	d.properties.lastFreq = 0;
      }
      })
  zoomComplete();
  })
  d3.selectAll("circle").style("display", "none")
  mapOff(.2);
  d3.select("#sankeyButton").style("display", "block")
}

function sankeyOff() {
      d3.select("#sankeyButton").style("display", "none");
      d3.selectAll("circle").style("display", "block")
      mapOff(1);
      d3.selectAll("path.routes").each(
      function(d) {
	d.properties.fixedWidth = 2;
  	d.properties.fixedColor = typeHash[d.properties.t];
      })
      zoomComplete();
}

function contextualHelp(helpString) {
  var helpText = "No help text found for " +helpString;
  switch(helpString) {
    case "transfer":
      helpText = "<p>The transfer cost adds the set number of days every time there is a switch between modes of transport. Switches between modes occur in changes from road to river, river to sea, and so on.</p>"
      break;
    case "advanced":
      helpText = "<p>Define your own custom costs for each mode.</p><p>This isn't currently operational.</p>"
      break;      
    case "voronoi":
      helpText = "<p>Create regions based on the current site categorization. This allows you to see regions of similar cost or cluster.</p>"
      break;      
    case "cluster":
      helpText = "<p>Indicate which sites are closer to centers. This is only useful after you've run two or more cartograms of the same priority.</p>"
      break;
    case "exportsvg":
      helpText = "<p>Save your map as SVG</p>"
      break;
    case "route":
      helpText = "<p>A route is the most efficient path based on your priority and restriction from the source site to the target site.</p>"
      break;
    case "cartogram":
      helpText = "<p>A cartogram calculates the cost from the source site to all target sites based on the direction and priority and restrictions you have set.</p>"
      break;
    case "minard":
      helpText = "<p>A Minard Diagram calculates all the most efficient routes to or from the selected site and aggregates those routes so that you can see the most used paths.</p>"
      break;
    case "":
      helpText = "<p>Between the domains controlled by your selected centers lies a contested region we call the 'frontier'. A setting of 1.0 will have no frontier--lower the tolerance to increase the size of the frontier.</p>"
      break;      
    case "":
      helpText = "<p></p>"
      break;      
  }
  d3.select("#infopopup").style("display", "block");
  d3.select("#infocontent").html(helpText);  
}

function createEssay(essayName) {
  d3.select("#essayBox").style("display", "block");
  d3.select('#essayContent').style('display','block');

  var essayPath="building.html";
    switch(essayName)
  {
    case 'intro':
    essayPath="assets/introducing.html"
    break;
    case 'understand':
    essayPath="assets/understanding.html"
    break;
    case 'build':
    essayPath="assets/building.html"
    break;
    case 'tutorial':
    essayPath="assets/using.html"
    break;
    case 'gallery':
    essayPath="assets/gallery.html"
    break;
    case 'scholarship':
    essayPath="assets/apply_TOC.html"
    break;
    case 'news':
    essayPath="assets/new.html"
    break;
    case 'media':
    essayPath="assets/media.html"
    break;
    case 'credits':
    essayPath="assets/credits.html"
    break;

  }
  
  

  
d3.text(essayPath, function(data) {
  d3.select("#essayContent").html(data);
})
}

function closeEssay() {
  d3.select('#essayBox').style('display','none');
  d3.select('#essayContent').style('display','none');
}
