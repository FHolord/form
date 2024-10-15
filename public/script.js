document.getElementById('coffeeForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const coffeeType = document.getElementById('coffeeType').value;
    const responseMessage = document.getElementById('responseMessage');
    const submitButton = document.querySelector('button[type="submit"]');
    responseMessage.innerHTML = '';

    // Disable the submit button to prevent multiple submissions
    submitButton.disabled = true;

    try {
        const response = await fetch('/submit-form', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ coffeeType }) 
        });

        const result = await response.json();

        if (result.success) {
            window.location.href = `/form-success.html?formId=${result.formId}`;
        } else {
            responseMessage.innerHTML = 'Error: ' + result.message;
        }
    } catch (error) {
        responseMessage.innerHTML = 'An error occurred while submitting the form.';
        console.error('Error submitting form:', error);
    } finally {
        // Re-enable the submit button after the request is completed
        submitButton.disabled = false;
    }
});
