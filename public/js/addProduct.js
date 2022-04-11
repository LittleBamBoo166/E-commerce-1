let user = JSON.parse(sessionStorage.user || null);
let loader = document.querySelector('.loader');

// checking user is logged in or not
window.onload = () => {
    if (user) {
        if (!compareToken(user.authToken, user.email)) {
            location.replace('/login');
        }
    } else {
        location.replace('/login');
    }
}

// price inputs
const actualPrice = document.querySelector('#actual-price');
const discountPercentage = document.querySelector('#discount');
const sellingPrice = document.querySelector('#sell-price');

discountPercentage.addEventListener('input', () => {
    if (discountPercentage.value > 100) {
        discountPercentage.value = 90;
    } else {
        let discount = actualPrice.value * discountPercentage.value / 100;
        sellingPrice.value = actualPrice.value - discount;
    }
})

sellingPrice.addEventListener('input', () => {
    let discount = (sellingPrice.value / actualPrice.value) * 100;
    discountPercentage.value = discount;
})

// upload image handle
let uploadImages = document.querySelectorAll('.fileupload');
let imagePaths = []; // will store all uploaded images paths

fetch('/s3url').then(res => res.json()).then(url => console.log(url));

uploadImages.forEach((fileupload, index) => {
    fileupload.addEventListener('change', () => {
        const file = fileupload.files[0];
        console.log(file);
        let imageURL;

        if (file.type.includes('image')) {
            // means user upload an image
            fetch('/s3url').then(res => res.json())
            .then(url => {
                fetch(url, {
                    method: 'PUT',
                    headers: new Headers({ 'Content-Type': 'multipart/form-data' }),
                    body: file
                }).then(res => {
                    imageURL = url.split("?")[0];
                    imagePaths[index] = imageURL;
                    // console.log(imageURL);
                    // let label = document.querySelector(`label[for=${fileupload.id}]`);
                    // label.style.backgroundImage = `url(${imageURL})`;
                })
            });
        }
    })
})