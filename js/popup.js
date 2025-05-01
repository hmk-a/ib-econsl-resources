
let popupDiv = $(".popup-container");
let popupImg = $(".gallery-popup-photo");
let popupDesc = $(".gallery-popup-desc").children("p");

function openGalleryPopup(graph) {
    popupDiv.addClass("show");

    let src = graph["image"];
    popupImg.attr("src", src);

    let desc = graph["name"];
    popupDesc.text(desc);
}

function closeGalleryPopup(e) {
    popupDiv.removeClass("show");
}

$(".popup-content").click(function (e) {
    e.stopPropagation();
});

$(document).ready(function () {
    $("#show-graph-btn").click(function (e) {
        openGalleryPopup(currentGraph);
    });
});