let vals = [];
let dates = [];
let sliderVal = 1655352000; //initialize sliderVal
let output = document.getElementById("output");
let button = document.getElementById("myButton");
let selector = document.getElementById('selectionBox');

let marginLeft = 50;
let marginRight = 0;
let marginTop = 0;
let marginBottom = 30;
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
            death: +d.death, death_imp: +d.death_imp,
            rate: +d.rate};
    }).then((data,err2)=>{
        console.log(data);

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
        let max = 0;
        let min = 0;
        let mid = 0;
        let continuousColor = 0;

        function calculateVals(){
            //Separates the values and dates from the main array
            vals.length = 0;
            for (let j = 0; j < data.length; j++) {
                vals.push(data[j][val_name]);
                dates.push(data[j]["date"]);
            }
            max = d3.max(vals);
            min = d3.min(vals);
            mid = min + (max-min)/2;
            continuousColor = d3.scaleLinear([min,max],[0,1.0]); //continuous version
        }

        let colorScale = d3.interpolateHsl(d3.hsl(120,1,0.5),d3.hsl(0,1.0,0.5)); //1 = green, 0 = red

        //Finds the closest value in 'array' to 'target'
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

        function onEachFeature(feature, layer){
            if (feature.properties && feature.properties.val) {
                layer.bindPopup('<div id="chart"></div>');
            }
            layer.on('click', function(e) {
                generateGraph(feature.properties["name"]);
            });
        }

        let map = L.map('map').setView([41.38016733657364, -72.10705729845692], 8); //new leaflet map
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        let layerGroup = new L.LayerGroup();
        layerGroup.addTo(map);

        generateMap(findClosest(dates, 1615252500.0)); //Initial generation
        //basic logic flow: if the date is the one given by slider, assign corresponding case value.
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
            layerGroup.addLayer(geojsonLayer);
            layerGroup.addTo(map);
            console.log("Generated new map");
        }

        // Add an event listener to the button
        document.getElementById("resetButton").addEventListener("click", function (){
            console.log("clicked!");
            val_name = selector.value;
            generateMap(findClosest(dates, sliderVal), true);
        });

        function generateGraph(cityName){
            if (document.getElementById('svgRemovable')){
                d3.select("#svgRemovable").remove();
            }
            let valPoints = [];
            let formattedDates = [];

            for (let i = data.length - 1; i > 0; i--) {
                if (data[i]["name"] == cityName) {
                    formattedDates.push(new Date(data[i]["date"] * 1000));
                    valPoints.push(data[i][val_name]);

                }
            }
            console.log(formattedDates);
            let minDate = formattedDates[0];
            let maxDate = formattedDates[formattedDates.length - 1];
            let minVal = d3.min(valPoints);
            let maxVal = d3.max(valPoints);

            // Declare the x (horizontal position) scale.
            const x = d3.scaleUtc([minDate,maxDate], [marginLeft, width - marginRight]);
            // Declare the y (vertical position) scale.
            const y = d3.scaleLinear([minVal, maxVal], [height - marginBottom, marginTop]);

            const lineData = formattedDates.map((date, index) => ({
                date: date,
                value: valPoints[index],
            }));

            console.log(lineData);

            // Declare the line generator.
            const line = d3.line()
                .x(d => x(d.date))
                .y(d => y(d.value));

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

            // Add the y-axis, remove the domain line, add grid lines and a label.
            svg.append("g")
                .attr("transform", `translate(${marginLeft},0)`)
                .call(d3.axisLeft(y).ticks(height / 40))
                .call(g => g.select(".domain").remove())
                .call(g => g.selectAll(".tick line").clone()
                    .attr("x2", width - marginLeft - marginRight)
                    .attr("stroke-opacity", 0.1));
        }
        generateGraph("Hartford");
    });
});