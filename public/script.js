// document.getElementById('coffeeForm').addEventListener('submit', async function (e) {
//     e.preventDefault();

//     const coffeeType = document.querySelector('input[name="coffeeType"]:checked').value; // Get selected coffee type
//     const responseMessage = document.getElementById('responseMessage');
//     const submitButton = document.querySelector('button[type="submit"]');
    
//     // Display "submitting" message
//     responseMessage.innerHTML = 'Form is submitting...';
//     responseMessage.style.color = 'blue'; // Make it visually distinct

//     // Disable the submit button to prevent multiple submissions
//     submitButton.disabled = true;

//     try {
//         const response = await fetch('/submit-form', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify({ coffeeType }) 
//         });

//         const result = await response.json();

//         if (result.success) {
//             window.location.href = `/form-success.html?formId=${result.formId}&coffeeType=${coffeeType}`;
//         } else {
//             responseMessage.innerHTML = 'Error: ' + result.message;
//             responseMessage.style.color = 'red';
//         }
//     } catch (error) {
//         responseMessage.innerHTML = 'An error occurred while submitting the form.';
//         responseMessage.style.color = 'red';
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
    responseMessage.style.color = '#005952'; 

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
            // Redirect to the success page
            window.location.href = '/form-success';
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
