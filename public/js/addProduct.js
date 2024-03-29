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
                        console.log(imageURL);
                        let label = document.querySelector(`label[for=${fileupload.id}]`);
                        label.style.backgroundImage = `url(${imageURL})`;
                        let productImage = document.querySelector('.product-image');
                        productImage.style.backgroundImage = `url(${imageURL})`;
                    })
                });
        } else {
            showAlert('upload image only');
        }
    })
})

// form submission
const productName = document.querySelector('#product-name');
const shortLine = document.querySelector('#short-des');
const des = document.querySelector('#des');

let sizes = []; // will store all the sizes

const stock = document.querySelector('#stock');
const tags = document.querySelector('#tags');
const tac = document.querySelector('#tac');

// buttons
const addProductBtn = document.querySelector('#add-btn');
const saveDraftBtn = document.querySelector('#save-btn');

// store size function
const storeSizes = () => {
    let sizeCheckBox = document.querySelectorAll('.size-checkbox');
    sizeCheckBox.forEach(item => {
        if (item.checked && !sizes.includes(item.value)) {
            sizes.push(item.value);
        }
    })
}

// validate form function, return true or false while doing validation
const validateForm = () => {
    if (!productName.value.length) {
        return showAlert('please enter the product name');
    } else if (shortLine.value.length > 100 || shortLine.value.length < 10) {
        return showAlert('short description must be between 10 to 100 letters long');
    } else if (!des.value.length) {
        return showAlert('please enter the detail description about the product');
    } else if (!imagePaths.length) {
        return showAlert('please upload at least one image of the product');
    } else if (!sizes.length) {
        return showAlert('please select at least one size');
    } else if (!actualPrice.value.length || !discountPercentage.value.length || !sellingPrice.value.length) {
        return showAlert('you must add pricings');
    } else if (stock.value < 20) {
        return showAlert('you must have at least 20 items in the stock');
    } else if (!tags.value.length) {
        return showAlert('enter few tags to help ranking your product in search');
    } else if (!tac.checked) {
        return showAlert('you must agree to our terms and conditions');
    }
    return true;
}

const productData = () => {
    let tagArr = tags.value.split(',');
    tagArr.forEach((item, index) => tagArr[index] = tagArr[index].trim());
    return data = {
        name: productName.value,
        shortDes: shortLine.value,
        des: des.value,
        images: imagePaths,
        sizes: sizes,
        actualPrice: actualPrice.value,
        discount: discountPercentage.value,
        sellPrice: sellingPrice.value,
        stock: stock.value,
        tags: tagArr,
        tac: tac.checked,
        email: user.email
    }
}

addProductBtn.addEventListener('click', () => {
    storeSizes();
    // console.log(sizes);
    // validate form
    if (validateForm()) {
        loader.style.display = 'block';
        let data = productData();
        if (productId) {
            data.id = productId;
        }
        sendData('/add-product', data);
    }
})

// save draft btn 
saveDraftBtn.addEventListener('click', () => {
    // alert('draft'); 
    storeSizes();
    // check for product name
    if (!productName.value.length) {
        showAlert('please enter the product name');
    } else {
        // dont validate the data
        let data = productData();
        data.draft = true;
        sendData('/add-product', data);
    }
})

// existing product detail handle
let productId = null;

const setFormsData = (data) => {
    console.log(data);
    productName.value = data.name;
    shortLine.value = data.shortDes;
    des.value = data.des;
    actualPrice.value = data.actualPrice;
    discountPercentage.value = data.discount;
    sellingPrice.value = data.sellPrice;
    stock.value = data.stock;
    tags.value = data.tags;

    // set up image
    imagePaths = data.images;
    imagePaths.forEach((url, i) => {
        let label = document.querySelector(`label[for=${uploadImages[i].id}]`);
        label.style.backgroundImage = `url(${url})`;
        let productImage = document.querySelector('.product-image');
        productImage.style.backgroundImage = `url(${url})`;
    })

    // set up sizes
    sizes = data.sizes;
    let sizeCheckBox = document.querySelectorAll('.size-checkbox');
    sizeCheckBox.forEach(item => {
        if (sizes.includes(item.value)) {
            item.setAttribute('checked', '');
        }
    })
}

const fetchProductData = () => {
    // delete the tempProduct from the session
    // delete sessionStorage.tempProduct;
    fetch('/get-products', {
        method: 'post',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email: user.email, id: productId })
    }).then((res) => res.json()).then(data => {
        // console.log(data);
        setFormsData(data);
    }).catch(err => {
        console.log(err);
    })
}
// console.log(location.pathname);
if (location.pathname != '/add-product') {
    productId = decodeURI(location.pathname.split('/').pop());

    // let productDetail = JSON.parse(sessionStorage.tempProduct || null);
    // fetch the data if product is not in session
    // if (productDetail == null) {
    fetchProductData();
    // }
}

