document.addEventListener('DOMContentLoaded', function () {
    let cart = [];
  
    function addToCart(product) {
      cart.push(product);
      updateCart();
    }
  
    function updateCart() {
      const cartContainer = document.querySelector('.space-y-4');
      const totalElement = document.querySelector('.text-xl.font-bold');
      cartContainer.innerHTML = '';
      let total = 0;
  
      cart.forEach((item, index) => {
        const cartItem = document.createElement('div');
        cartItem.className = 'flex justify-between items-center border p-4';
  
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.name;
        img.className = 'h-12';
  
        const itemDetails = document.createElement('div');
        itemDetails.className = 'flex-1 ml-4';
        itemDetails.innerHTML = `<h3 class="text-lg font-bold">${item.name}</h3><p class="text-zinc-600 dark:text-zinc-400">${item.description}</p>`;
  
        const price = document.createElement('span');
        price.className = 'text-zinc-700 dark:text-zinc-300';
        price.textContent = `Rs. ${item.price}`;
  
        cartItem.appendChild(img);
        cartItem.appendChild(itemDetails);
        cartItem.appendChild(price);
  
        cartContainer.appendChild(cartItem);
  
        total += item.price;
      });
  
      totalElement.textContent = `Total: Rs. ${total}`;
    }
  
    const buttons = document.querySelectorAll('.grid .border .btn');
    buttons.forEach(button => {
      button.addEventListener('click', function () {
        const productElement = this.parentElement;
        const product = {
          image: productElement.querySelector('img').src,
          name: productElement.querySelector('h2').textContent,
          description: productElement.querySelector('p').textContent,
          price: parseInt(productElement.querySelector('.text-xl.font-bold').textContent.replace('Rs. ', ''))
        };
        addToCart(product);
      });
    });
  });
  