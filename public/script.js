// document.getElementById('coffeeForm').addEventListener('submit', async function (e) {
//     e.preventDefault();

//     // Get the selected coffee type from the radio buttons
//     const coffeeType = document.querySelector('input[name="coffeeType"]:checked');
//     const responseMessage = document.getElementById('responseMessage');
//     const submitButton = document.querySelector('button[type="submit"]');
//     responseMessage.innerHTML = '';

//     // Check if a coffee type is selected
//     if (!coffeeType) {
//         responseMessage.innerHTML = 'Please select a coffee type.';
//         return;
//     }

//     // Disable the submit button to prevent multiple submissions and show "Form is submitting"
//     submitButton.disabled = true;
//     responseMessage.innerHTML = 'Form is submitting...';

//     try {
//         const response = await fetch('/submit-form', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify({ coffeeType: coffeeType.value }) // Send the selected coffee type value
//         });

//         const result = await response.json();

//         if (result.success) {
//             responseMessage.innerHTML = 'Redirecting...'; // Show redirecting message
//             window.location.href = `/form-success.html?formId=${result.formId}`;
//         } else {
//             responseMessage.innerHTML = 'Error: ' + result.message;
//         }
//     } catch (error) {
//         responseMessage.innerHTML = 'An error occurred while submitting the form.';
//         console.error('Error submitting form:', error);
//     } finally {
//         // Re-enable the submit button after the request is completed
//         submitButton.disabled = false;
//     }
// });


document.getElementById('coffeeForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const coffeeType = document.querySelector('input[name="coffeeType"]:checked').value; // Get selected coffee type
    const responseMessage = document.getElementById('responseMessage');
    const submitButton = document.querySelector('button[type="submit"]');
    
    // Display "submitting" message
    responseMessage.innerHTML = 'Form is submitting...';
    responseMessage.style.color = 'blue'; // Make it visually distinct

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
            responseMessage.style.color = 'red';
        }
    } catch (error) {
        responseMessage.innerHTML = 'An error occurred while submitting the form.';
        responseMessage.style.color = 'red';
        console.error('Error submitting form:', error);
    } finally {
        // Re-enable the submit button after the request is completed
        submitButton.disabled = false;
    }
});
