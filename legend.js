d3.svg.legend = function() {
    
    var legendValues=[{color: "red", stop: [0,1]},{color: "blue", stop: [1,2]},{color: "purple", stop: [2,3]},{color: "yellow", stop: [3,4]},{color: "Aquamarine", stop: [4,5]}];
    var legendScale;
    var cellWidth = 30;
    var cellHeight = 20;
    var adjustable = false;
    var labelFormat = d3.format(".01f");
    var labelUnits = "units";
    var lastValue = 6;
//    var legEvent = d3.dispatch("legendChange");
    var changeValue = 1;
    var legEvent = d3.dispatch(legend, "something", "somethingelse")
   
    function legend(g) {
    
    function cellRange(valuePosition, changeVal) {
    legendValues[valuePosition].stop[0] += changeVal;
    legendValues[valuePosition - 1].stop[1] += changeVal;
    g.selectAll("text.breakLabels").text(function(d) {return labelFormat(d.stop[0])})
    updateSiteLegend();
    }
    
    function deleteCell(valuePosition) {
        legendValues[valuePosition - 1].stop[1] = legendValues[valuePosition].stop[1];
        legendValues.splice(valuePosition,1);
        redraw();
    }
    
    function redraw() {
        g.selectAll("g.legendCells").data(legendValues).exit().remove();
        g.selectAll("g.legendCells").select("text.breakLabels").text(function(d) {return labelFormat(d.stop[0])});
        g.selectAll("g.legendCells").select("rect").style("fill", function(d) {return d.color});
        g.selectAll("g.legendCells").attr("transform", function(d,i) {return "translate(" + (i * cellWidth) + ",0)" });
        g.selectAll("text.breakLabels").text(function(d) {return labelFormat(d.stop[0])});
        
    }
    g.selectAll("g.legendCells")
    .data(legendValues)
    .enter()
    .append("g")
    .attr("class", "legendCells")
    .attr("transform", function(d,i) {return "translate(" + (i * cellWidth) + ",0)" })
    
    g.selectAll("g.legendCells")
    .append("rect")
    .attr("height", cellHeight)
    .attr("width", cellWidth)
    .style("fill", function(d) {return d.color})
    .style("stroke", "black")
    .style("stroke-width", "2px");

    g.selectAll("g.legendCells")
    .append("text")
    .attr("class", "breakLabels")
    .style("display", function(d,i) {return i == 0 ? "none" : "block"})
    .attr("x", 0)
    .attr("y", -7)
    .style("pointer-events", "none")
    .style("text-anchor", "middle")
    .text(function(d) {return labelFormat(d.stop[0])})
    
    g.selectAll("g.legendCells")
    .append("circle")
    .attr("r", 6)
    .attr("cx", -7)
    .style("display", function(d,i) {return i == 0 ? "none" : "block"})
    .style("fill", "white")
    .style("stroke", "black")
    .style("stroke-width", "1px")
    .style("cursor", "pointer")
    .on("click", function(d,i) {cellRange(i, -changeValue)});

    g.selectAll("g.legendCells")
    .append("circle")
    .attr("r", 6)
    .attr("cx", 7)
    .style("display", function(d,i) {return i == 0 ? "none" : "block"})
    .style("fill", "white")
    .style("stroke", "black")
    .style("cursor", "pointer")
    .style("stroke-width", "1px")
    .on("click", function(d,i) {cellRange(i, changeValue)})
    ;

    g.selectAll("g.legendCells")
    .append("text")
    .style("pointer-events", "none")
    .style("font-weight", 900)
    .style("display", function(d,i) {return i == 0 ? "none" : "block"})
    .attr("x", -7)
    .attr("y", 5)
    .style("text-anchor", "middle")
    .text("-");

    g.selectAll("g.legendCells")
    .append("text")
    .style("pointer-events", "none")
    .style("font-weight", 900)
    .style("display", function(d,i) {return i == 0 ? "none" : "block"})
    .attr("x", 7)
    .attr("y", 4)
    .style("text-anchor", "middle")
    .text("+");

    g.selectAll("g.legendCells")
    .append("circle")
    .attr("cy", cellHeight)
    .attr("r", 6)
    .style("display", function(d,i) {return i == 0 ? "none" : "block"})
    .style("fill", "gray")
    .style("stroke", "black")
    .style("cursor", "pointer")
    .style("stroke-width", "1px")
    .on("click", function(d,i) {deleteCell(i)});
    
    g.selectAll("g.legendCells")
    .append("text")
    .style("pointer-events", "none")
    .style("font-weight", 900)
    .style("display", function(d,i) {return i == 0 ? "none" : "block"})
    .attr("y", cellHeight + 4)
    .style("text-anchor", "middle")
    .text("x");
    
    }
    
    legend.inputScale = function(newScale) {
        if (!arguments.length) return scale;
            scale = newScale;
            legendValues = [];
            if (scale.invertExtent) {
                //Is a quantile scale
                scale.range().forEach(function(el) {
                    var cellObject = {color: el, stop: scale.invertExtent(el)}
                    legendValues.push(cellObject)
                })
            }
            return this;
    }
    
    legend.scale = function(testValue) {
        var foundColor = legendValues[legendValues.length - 1].color;
        for (el in legendValues) {
            if(testValue < legendValues[el].stop[1]) {
                foundColor = legendValues[el].color;
                break;
            }
        }
        return foundColor;
    }

    legend.cellWidth = function(newCellSize) {
        if (!arguments.length) return cellWidth;
            cellWidth = newCellSize;
            return this;
    }

    legend.cellHeight = function(newCellSize) {
        if (!arguments.length) return cellHeight;
            cellHeight = newCellSize;
            return this;
    }

    legend.cellExtent = function(incColor,newExtent) {
        var selectedStop = legendValues.filter(function(el) {return el.color == incColor})[0].stop;
        if (arguments.length == 1) return selectedStop;
            legendValues.filter(function(el) {return el.color == incColor})[0].stop = newExtent;
            return this;
    }
    
    legend.cellStepping = function(incStep) {
        if (!arguments.length) return changeValue;
            changeValue = incStep;
            return this;
    }

return legend;    
    
}