let sliderVal = 1655352000; //initialize sliderVal
let output = document.getElementById("output");
let button = document.getElementById("myButton");
let selector = document.getElementById('selectionBox');

let marginLeft = 50;
let marginRight = 20;
let marginTop = 20;
let marginBottom = 20;
const width = 1000;
const height = 500;

output.innerHTML = "6/16/2022";

let val_name = selector.value; //case, death, or rate

d3.json("ct-towns-2022-simple-datactgov.geojson").then((geojson,err1)=> {
    d3.dsv(",","covid_imp.csv",(d)=>{
        return{
            date: d.date,
            name: d.city,
            case: +d.case, case_imp: +d.case_imp,
            death: +d.death, death_imp: +d.death_imp
        };
    }).then((data,err2)=>{
        console.log(data);

        let max = 0;
        let min = 0;
        let mid = 0;
        let continuousColor = 0;
        let vals = [];
        let dates = [];
        //let imps = []; used to test for imputated values, but there are none
        let colorScale = d3.interpolateHsl(d3.hsl(120,1,0.5),d3.hsl(0,1.0,0.5)); //1 = green, 0 = red

        //Slider Code
        let slider = document.getElementById("myRange");
        // Update the current slider value (each time you drag the slider handle)
        slider.oninput = function() {
            sliderVal = findClosest(dates,this.value);
            //console.log(sliderVal);

            let date = new Date(sliderVal * 1000);
            let year = date.getFullYear();
            let month = date.getMonth()+1;
            let day = date.getDate();

            output.innerHTML = month + '/' + day + '/' + year;
        }

        //vals and dates are ALL values and dates in the dataset.
        function calculateVals(){
            //Separates the values and dates from the main array
            vals.length = 0;
            dates.length = 0;
            for (let j = 0; j < data.length; j++) {
                vals.push(data[j][val_name]);
                dates.push(data[j]["date"]);
            }
            max = d3.max(vals);
            min = d3.min(vals);
            mid = min + (max-min)/2;
            continuousColor = d3.scaleLog([min+0.1,max],[0,1.0]); //continuous version
        }

        //Finds the closest value in 'array' to 'target'
        //https://www.geeksforgeeks.org/dsa/find-closest-number-array/
        function findClosest(array, target) {
            let res = array[0];
            for (let i = 1; i < array.length; i++) {
                // update the result if we find a closer element.
                if (Math.abs(array[i] - target) <= Math.abs(res - target)) {
                    res = array[i];
                }
            }
            return res;
        }

        function townStyle(feature){
            return {
                "color": colorScale(continuousColor(feature.properties["val"])), //use colormap or colorscale
                "weight": 1
            }
        }

        function onEachFeature(feature, layer){ //I suspect something is afoot here...
            if (feature.properties && feature.properties.val) {
                layer.on('click', e => {
                    generateGraph(feature.properties.name);
                    updateCityName(feature.properties.name);
                });
            }
        }
        
        function updateCityName(name){
            document.getElementById("cityName").innerText = "City: " + name;
        }

        let map = L.map('map').setView([41.58016733657364, -72.70705729845692], 9); //new leaflet map
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        let layerGroup = new L.LayerGroup();
        layerGroup.addTo(map);

        calculateVals();
        generateMap(findClosest(dates, 1615252500.0)); //Initial generation
        generateLegend();
        generateGraph("Hartford");
        updateCityName("Hartford");

        // Add an event listener to the button to reset the map
        document.getElementById("resetButton").addEventListener("click", function (){
            console.log("clicked!");
            val_name = selector.value;
            generateMap(findClosest(dates, sliderVal), true);
            generateLegend();
        });

        //Map generation code, given a date to use and whether to delete the last one
        function generateMap(chosenDate, clicked){
            calculateVals();
            console.log("Generating Map");
            for (let i = 0; i < geojson.features.length; i++) {
                for (let j = 0; j < data.length; j++) {
                    if (data[j]["date"] === chosenDate) {
                        if (geojson.features[i].properties["name"] === data[j]["name"]) {
                            geojson.features[i].properties["val"] = data[j][val_name];
                        }
                    }
                }
            }

            let geojsonLayer = L.geoJSON(geojson,{style:townStyle, onEachFeature:onEachFeature});
            if (clicked) { // Check if the layer already exists on the map
                layerGroup.clearLayers();
                console.log("Removed old map");
            }
            console.log(val_name);
            layerGroup.addLayer(geojsonLayer);
            layerGroup.addTo(map);
            console.log("Generated new map");
        }
        //function to generate the d3 graph
        function generateGraph(cityName){
            let valPoints = [];
            let formattedDates = [];

            //These two arrays are of the dates and values ONLY of the city chosen!
            for (let i = data.length - 1; i > 0; i--) {
                if (data[i]["name"] === cityName) {
                    formattedDates.push(new Date(data[i]["date"] * 1000));
                    valPoints.push(data[i][val_name]);
                }
            } //I know there's a lot of redundant looping over the data. I cant be bothered to lump it all together

            let minDate = formattedDates[0];
            let maxDate = formattedDates[formattedDates.length - 1];
            let minVal = d3.min(valPoints);
            let maxVal = d3.max(valPoints);

            // Declare the x and y scales.
            const x = d3.scaleUtc([minDate,maxDate], [marginLeft, width - marginRight]);
            const y = d3.scaleLinear([minVal, maxVal], [height - marginBottom, marginTop]);

            //combines the formatted date and value data into one clean array
            let lineData = formattedDates.map((date, index) => ({
                date: date,
                value: valPoints[index],
            }));

            //console.log(lineData);

            // Declare the line generator.
            let line = d3.line()
                .x(d => x(d.date))
                .y(d => y(d.value));

            if (document.getElementById("svgRemovable") !== null) {
                d3.select("#svgRemovable").remove();
            }

            // Create the SVG container.
            let svg = d3.select("#chart")
                .append("svg")
                .attr("id", "svgRemovable")
                .attr("width", width)
                .attr("height", height)
                .attr("viewBox", [0, 0, width, height])
                .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

            // Append a path for the line.
            svg.append("path")
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 1.5)
                .attr("d", line(lineData));

            // Add the x-axis.
            svg.append("g")
                .attr("transform", `translate(0,${height - marginBottom})`)
                .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));

            // Add the y-axis, remove the domain line, add grid lines.
            svg.append("g")
                .attr("transform", `translate(${marginLeft},0)`)
                .call(d3.axisLeft(y).ticks(height / 40))
                .call(g => g.select(".domain").remove())
                .call(g => g.selectAll(".tick line").clone()
                    .attr("x2", width - marginLeft - marginRight)
                    .attr("stroke-opacity", 0.1));
        }

        //https://d3-legend.susielu.com/#color-examples
        function generateLegend(){
            calculateVals();
            console.log(min + " " + max);
            let tempmin = 1;
            if (min !== 0){
                tempmin = min;
            }
            let log = d3.scaleLog()
                .domain([tempmin, max])
                .interpolate(() => d3.interpolateHsl(d3.hsl(120,1,0.5),d3.hsl(0,1.0,0.5)));

            let svg = 0;

            if (document.getElementById('legend') == null) {
                svg = d3.select("#legendContainer")
                    .append("svg")
                    .attr("id", "legend");
                svg.append("g")
                    .attr("class", "legendLog")
                    .attr("transform", "translate(20,0)");
            } else {
                svg = d3.select("#legend")
            }

            let cells = [];
            switch (val_name) {
                case "case":
                    cells = [min, 100, 200, 500, 1000, 2000, 5000, 10000, max];
                    break;
                case "death":
                    cells = [1, 10, 20, 30, 40, 50, 100, 200, max];
            }
            let logLegend = d3.legendColor()
                .scale(log)
                .shapeWidth(60)
                .orient('horizontal')
                .cells(cells)

            svg.select(".legendLog").call(logLegend);
        }
    });
});