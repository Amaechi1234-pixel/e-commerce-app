document.addEventListener('DOMContentLoaded', function () {
  var deleteBtns = document.querySelectorAll('.deleteBtn');
  deleteBtns.forEach(function (deleteBtn) {
    deleteBtn.addEventListener("click", async function (event) {
      event.preventDefault();

      var BtnID = this.id;
      var productID = BtnID.replace(/Delete-/g, "");
      console.log("Product ID:", productID);

      const csrfToken = this.closest('.product-item')
        .querySelector('input[name="_csrf"]').value;

      try {
        const response = await fetch(`/admin/delete-product/${productID}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'CSRF-Token': csrfToken
          }
        });

        if (!response.ok) {
          throw new Error(`Deletion failed with status: ${response.status}`);
        }

        const jsonResponse = await response.json();
        console.log("Server Success Message:", jsonResponse.message);

        // Remove product card from DOM
        this.closest('.product-item').remove();

      } catch (error) {
        console.error('Error during product deletion:', error.message);
        alert('Could not delete product due to an error.');
      }
    });
  });
});