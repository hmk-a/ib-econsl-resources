$(document).ready(function () {
    $('#graph-ui-container button').click(function () {
        if ($(this).is('#clear-btn')) return;
        $('#graph-ui-container button').removeClass('active');
        $(this).addClass('active');
    });

    $('#clear-btn').click(function () {
        $("#color-container").hide();
        $('#graph-ui-container button').removeClass('active');
    });




});




