describe('Form State Tracking', () => {
  beforeEach(() => {
    cy.visit('/form-state')
  })

  it('should display all form state properties', () => {
    cy.getByTestId('state-is-dirty').should('be.visible')
    cy.getByTestId('state-is-valid').should('be.visible')
    cy.getByTestId('state-is-submitting').should('be.visible')
    cy.getByTestId('state-is-submitted').should('be.visible')
    cy.getByTestId('state-is-submit-successful').should('be.visible')
    cy.getByTestId('state-submit-count').should('be.visible')
    cy.getByTestId('state-is-loading').should('be.visible')
    cy.getByTestId('state-dirty-fields').should('be.visible')
    cy.getByTestId('state-touched-fields').should('be.visible')
    cy.getByTestId('state-errors').should('be.visible')
  })

  it('should track isDirty state', () => {
    cy.expectText('state-is-dirty', 'false')

    cy.fillInput('username-input', 'testuser')

    cy.expectText('state-is-dirty', 'true')
  })

  it('should track dirtyFields', () => {
    cy.expectText('state-dirty-fields', 'none')

    cy.fillInput('username-input', 'testuser')
    cy.expectText('state-dirty-fields', 'username')

    cy.fillInput('email-input', 'test@example.com')
    cy.getByTestId('state-dirty-fields').should('contain', 'username')
    cy.getByTestId('state-dirty-fields').should('contain', 'email')
  })

  it('should track touchedFields on blur', () => {
    cy.expectText('state-touched-fields', 'none')

    cy.getByTestId('username-input').focus().blur()
    cy.expectText('state-touched-fields', 'username')

    cy.getByTestId('email-input').focus().blur()
    cy.getByTestId('state-touched-fields').should('contain', 'username')
    cy.getByTestId('state-touched-fields').should('contain', 'email')
  })

  it('should track isSubmitted after form submission', () => {
    cy.expectText('state-is-submitted', 'false')

    cy.getByTestId('submit-button').click()

    cy.expectText('state-is-submitted', 'true')
  })

  it('should track submitCount', () => {
    cy.expectText('state-submit-count', '0')

    cy.getByTestId('submit-button').click()
    cy.expectText('state-submit-count', '1')

    cy.getByTestId('submit-button').click()
    cy.expectText('state-submit-count', '2')
  })

  it('should track isSubmitSuccessful', () => {
    cy.expectText('state-is-submit-successful', 'false')

    // Submit with invalid data
    cy.getByTestId('submit-button').click()
    cy.expectText('state-is-submit-successful', 'false')

    // Submit with valid data
    cy.fillInput('username-input', 'testuser')
    cy.fillInput('email-input', 'test@example.com')
    cy.getByTestId('submit-button').click()

    cy.expectText('state-is-submit-successful', 'true')
  })

  it('should track errors', () => {
    cy.expectText('state-errors', 'none')

    cy.getByTestId('submit-button').click()

    cy.getByTestId('state-errors').should('contain', 'username')
    cy.getByTestId('state-errors').should('contain', 'email')
  })

  it('should track isValid', () => {
    cy.expectText('state-is-valid', 'true') // Initially valid (no validation run)

    // Trigger validation with invalid data (onBlur mode)
    cy.fillInput('username-input', 'ab')
    cy.getByTestId('email-input').focus()

    cy.expectText('state-is-valid', 'false')

    // Fix the errors
    cy.clearInput('username-input')
    cy.fillInput('username-input', 'validuser')
    cy.fillInput('email-input', 'valid@example.com')
    cy.getByTestId('bio-input').focus()

    cy.expectText('state-is-valid', 'true')
  })

  it('should capture field state snapshot via getFieldState', () => {
    cy.fillInput('username-input', 'testuser')
    cy.getByTestId('email-input').focus() // Blur username to mark it touched

    cy.getByTestId('get-field-state-button').click()

    cy.getByTestId('field-state-snapshot').should('contain', 'isDirty').and('contain', 'isTouched')
  })
})
