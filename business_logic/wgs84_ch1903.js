// The MIT License (MIT)
// 
// Copyright (c) 2014 Federal Office of Topography swisstopo, Wabern, CH
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
//  of this software and associated documentation files (the "Software"), to deal
//  in the Software without restriction, including without limitation the rights
//  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//  copies of the Software, and to permit persons to whom the Software is
//  furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
//  all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
//  THE SOFTWARE.
// 
	
// Source: http://www.swisstopo.admin.ch/internet/swisstopo/en/home/topics/survey/sys/refsys/projections.html (see PDFs under "Documentation")
// Updated 9 dec 2014
// Please validate your results with NAVREF on-line service: http://www.swisstopo.admin.ch/internet/swisstopo/en/home/apps/calc/navref.html (difference ~ 1-2m)

// Convert WGS lat/long (dec) to CH y
function WGStoCHy(lat, lng) {

  // Convert decimal degrees to sexagesimal seconds
  lat = DECtoSEX(lat);
  lng = DECtoSEX(lng);

  // Auxiliary values (% Bern)
  var lat_aux = (lat - 169028.66)/10000;
  var lng_aux = (lng - 26782.5)/10000;
  
  // Process Y
  return 600072.37
     + 211455.93 * lng_aux 
     -  10938.51 * lng_aux * lat_aux
     -      0.36 * lng_aux * Math.pow(lat_aux,2)
     -     44.54 * Math.pow(lng_aux,3);

}

// Convert WGS lat/long (dec) to CH x
function WGStoCHx(lat, lng) {
  
  // Convert decimal degrees to sexagesimal seconds
  lat = DECtoSEX(lat);
  lng = DECtoSEX(lng);
  
  // Auxiliary values (% Bern)
  var lat_aux = (lat - 169028.66)/10000;
  var lng_aux = (lng - 26782.5)/10000;

  // Process X
  return 200147.07
     + 308807.95 * lat_aux 
     +   3745.25 * Math.pow(lng_aux,2)
     +     76.63 * Math.pow(lat_aux,2)
     -    194.56 * Math.pow(lng_aux,2) * lat_aux
     +    119.79 * Math.pow(lat_aux,3);
  
}

// Convert angle in decimal degrees to sexagesimal seconds
function DECtoSEX(angle) {

  // Extract DMS
  var deg = parseInt(angle);
  var min = parseInt((angle-deg)*60);
  var sec = (((angle-deg)*60)-min)*60;   

  // Result sexagesimal seconds
  return sec + min*60.0 + deg*3600.0;
  
}

module.exports = {
    "WGStoCHy": WGStoCHy,
    "WGStoCHx": WGStoCHx
};