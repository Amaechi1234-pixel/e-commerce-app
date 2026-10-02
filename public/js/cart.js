document.querySelectorAll(".quantity-stepper-form").forEach((form) => {
  const input = form.querySelector(".quantity-input");
  const minusBtn = form.querySelector(".minus");
  const plusBtn = form.querySelector(".plus");

  minusBtn.addEventListener("click", () => {
    const current = parseInt(input.value);
    if (current > 1) {
      input.value = current - 1;
      form.submit();
    }
  });

  plusBtn.addEventListener("click", () => {
    const current = parseInt(input.value);
    if (current < 99) {
      input.value = current + 1;
      form.submit();
    }
  });
});