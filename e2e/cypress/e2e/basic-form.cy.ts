describe('Basic Form', () => {
  beforeEach(() => {
    cy.visit('/basic')
  })

  it('should display the form with all fields', () => {
    cy.getByTestId('email-input').should('be.visible')
    cy.getByTestId('name-input').should('be.visible')
    cy.getByTestId('password-input').should('be.visible')
    cy.getByTestId('submit-button').should('be.visible')
  })

  it('should show validation errors on submit with empty fields', () => {
    cy.getByTestId('submit-button').click()

    cy.expectError('email-error', 'Please enter a valid email')
    cy.expectError('name-error', 'Name must be at least 2 characters')
    cy.expectError('password-error', 'Password must be at least 8 characters')
  })

  it('should show validation error for invalid email', () => {
    cy.fillInput('email-input', 'invalid-email')
    cy.fillInput('name-input', 'John')
    cy.fillNestedInput('password-input', 'password123')

    cy.getByTestId('submit-button').click()

    cy.expectError('email-error', 'Please enter a valid email')
  })

  it('should submit successfully with valid data', () => {
    cy.fillInput('email-input', 'test@example.com')
    cy.fillInput('name-input', 'John Doe')
    cy.fillNestedInput('password-input', 'password123')

    cy.getByTestId('submit-button').click()

    cy.getByTestId('submitted-data').should('contain', 'test@example.com')
    cy.getByTestId('submitted-data').should('contain', 'John Doe')
  })

  it('should track dirty state', () => {
    cy.expectText('is-dirty', 'false')

    cy.fillInput('email-input', 'test@example.com')

    cy.expectText('is-dirty', 'true')
  })

  it('should increment submit count on each submission', () => {
    cy.expectText('submit-count', '0')

    cy.getByTestId('submit-button').click()
    cy.expectText('submit-count', '1')

    cy.getByTestId('submit-button').click()
    cy.expectText('submit-count', '2')
  })

  it('should clear errors when valid data is entered and resubmitted', () => {
    // Submit with empty fields to trigger errors
    cy.getByTestId('submit-button').click()
    cy.expectError('email-error', 'Please enter a valid email')

    // Fill in valid data
    cy.fillInput('email-input', 'test@example.com')
    cy.fillInput('name-input', 'John Doe')
    cy.fillNestedInput('password-input', 'password123')

    // Resubmit
    cy.getByTestId('submit-button').click()

    // Errors should be gone
    cy.getByTestId('email-error').should('not.exist')
    cy.getByTestId('submitted-data').should('be.visible')
  })
})
