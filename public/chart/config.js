var options = {

    type: 'line',
  
    data: {
  
      datasets: [{
        borderColor: 'White',
        data: []
  
      }, {
        borderColor: '#ff8697',
        data: []
  
      }]
  
    },
  
    options: {
    elements: { point: { radius: 0 } },
      scales: {
        yAxes: [{
            ticks: {
                beginAtZero: true
            }
        }],
        xAxes: [{
  
          type: 'realtime',
          ticks: {
            display: false //this will remove only the label
            }
  
        }]
  
      },
      
        tooltips: {
            enabled: false
       },
       legend: {
            display: false,
        }

    }
  
  }

export default options;