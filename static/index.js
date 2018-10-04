$(document).ready(function () {
  var childIcon;

  if (localStorage.getItem("tbljson") == null){
    var today = new Date()
    var json = []
    while (startDate < endDate && json.length < 20) {
      json.push({
        "Day": startDate.yyyymmdd(),
        "Full_Name": "Full Name",
        "Email_Address": "email@address.com",
        "isRequested": "no",
        "isConfirmed": "no",
        "isReminded": "no"
      })
      startDate = startDate.addDays(7)
    }

    localStorage.setItem("tbljson", JSON.stringify(json));
    var myjson = JSON.parse(localStorage.getItem("tbljson"));
  }
  else{
    var myjson = JSON.parse(localStorage.getItem("tbljson"));
  }

  // build the table from JSON
  var tr;
  for (var i = 0; i < myjson.length; i++) {
    tr = $('<tr/>');
    var parts = myjson[i].Day.split('-');
    var myDate = new Date(parts[0], parts[1] - 1, parts[2]);
    var today = new Date();

    if (myDate < today) {
      tr.addClass('past')
    } else {
      tr.addClass('future')
    }
    tr.append("<td>" + myjson[i].Day + "</td>");
    tr.append("<td><span>" + myjson[i].Full_Name + "</span></td>"); // editable
    tr.append("<td><span>" + myjson[i].Email_Address + "</span></td>");
    tr.append("<td class='td-click td-email td-request'>" + checkBlock(myjson[i].isRequested) + "</td>");
    tr.append("<td class='td-click'>" + checkBlock(myjson[i].isConfirmed) + "</td>");
    tr.append("<td class='td-click td-email td-remind'>" + checkBlock(myjson[i].isReminded) + "</td>");
    $('tbody').append(tr);
  }



  /* --- sort Table click --*/

  $("table").tablesorter( {sortList: [ [0,0]]} ); //This tells tablesorter to sort on the NAME column in ascending order.

  // first run set colors for blocked.
  $("tbody").find("td").each(function() {
    var result = $(this).find('i.isBlocked');
    $(result).parent().addClass("btn-success");
  });


  //$("td").click(function(){alert($(this).html())}); // test cell

  // setup alerted active status
  $('tr.future i').click(function(){
    var $p = $(this).parent();
    $(this).toggleClass("fas fa-check isBlocked");
    $p.toggleClass("btn-success");
    $(this).toggleClass('fas fa-circle isFree');
    saveTable()
  });

  // setup alerted active status
  $('tr.future td.td-email').contextmenu(function(){
    var $p = $(this).parent();
    var $td = $('td', $p);
    var full_name = $td.eq(1).text()
    var first_name = full_name.split(' ')[0]
    var email = $td.eq(2).text()
    var parts = $td.eq(0).text().split('-');
    var myDate = new Date(parts[0], parts[1] - 1, parts[2]);
    var date = myDate.toDateString()
    childIcon = $(this).find( "i" )

    var custom_khateeb_request_email = khateeb_request_email.replace(
      '{first_name}',first_name).replace('{date}',date)
    var custom_khateeb_remind_email = khateeb_remind_email.replace(
      '{first_name}',first_name).replace('{date}',date)
    $('#modal-to-name-field').text(full_name)
    $('#modal-to-email-field').text(email)
    if ($(this).hasClass('td-request')) {
      $('#modal-body-field').html(custom_khateeb_request_email)
      $('#modal-title').text('Khutbah Request')
    }
    if ($(this).hasClass('td-remind')) {
      $('#modal-body-field').html(custom_khateeb_remind_email)
      $('#modal-title').text('[Test] Khutbah Reminder')
    }
    $('#myModal').modal('show');
    return false;
  });


  // make editable regions from plugin
  $('tr.future td span').editable({
    type: 'text',
    mode: 'inline',
    success: function(response, newValue) {
                $(this).html(newValue)
                $(this).css('display', 'inline')
                saveTable()
             },
    title: 'Enter username'
  });

  // takes the name from the header and uses that as our return key for json
  function saveTable(){
    // try another josn
    $("span").removeClass("editable-unsaved");
    var tbl = $('tbody tr').map(function(i, v) {
      var $td = $('td', this);
      return {
        Day: $td.eq(0).text(), // ++i
        Full_Name: $td.eq(1).text(),
        Email_Address: $td.eq(2).text(),
        isRequested: checkBlock2($td.eq(3).html()),
        isConfirmed: checkBlock2($td.eq(4).html()),
        isReminded: checkBlock2($td.eq(5).html())
      };
    }).get();


    // Save the amended table to LocalStorage - overwrite
    localStorage.setItem("tbljson", JSON.stringify(tbl));
    console.log("Table saved!")
  }

  $('#modal-send-button').click(function() {
      var button = $(this)
      button.addClass('disabled');
      $.ajax({
          url: '/send-email',
          data: JSON.stringify({
            'email': $('#modal-to-email-field').text(),
            'body': $('#modal-body-field').html(),
            'subject': $('#modal-title').text()
          }),
          dataType: 'json',
          contentType: 'application/json',
          type: 'POST',
          success: function(response) {
              button.html('Sent successfully!')
              setTimeout(function(){
                  $('#myModal').modal('hide');
                  button.removeClass('disabled');
                  button.html('Send')
              }, 500);
              childIcon.click()
          },
          error: function(error) {
            $(this).html('Error! Check terminal logs.')
          }
      });
  });

}); // end doc ready

// increments dates
Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

// converts to str
Date.prototype.yyyymmdd = function() {
  var mm = this.getMonth() + 1; // getMonth() is zero-based
  var dd = this.getDate();

  return [this.getFullYear(),
          (mm>9 ? '' : '0') + mm,
          (dd>9 ? '' : '0') + dd
        ].join('-');
};


//when building the table replace the boolean with icons
function checkBlock(n) {
  var nom
  if (n.match("yes$")) {
    nom = n.replace('yes', "<i class='fas fa-check isBlocked'></i>");
    var $p = $(this).parent();
    $p.toggleClass("btn-success");
  } else {
    nom = n.replace('no', "<i class='fas fa-circle isFree'></i>");
  }
  return nom
}

// if YES then they are blocked.
function checkBlock2(n) {
  var nom
  if (n.match("isFree")) {
    nom = 'no';
  } else {
    nom = "yes";
  }
  return nom
}
