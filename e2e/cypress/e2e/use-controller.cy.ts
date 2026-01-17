describe('useController', () => {
  beforeEach(() => {
    cy.visit('/use-controller')
  })

  it('should display all controller fields', () => {
    cy.getByTestId('firstname-input').should('be.visible')
    cy.getByTestId('lastname-input').should('be.visible')
    cy.getByTestId('email-input').should('be.visible')
  })

  it('should track isDirty state correctly', () => {
    cy.getByTestId('firstname-state').should('contain', 'isDirty: false')

    cy.fillInput('firstname-input', 'John')

    cy.getByTestId('firstname-state').should('contain', 'isDirty: true')
  })

  it('should track isTouched state correctly', () => {
    cy.getByTestId('firstname-state').should('contain', 'isTouched: false')

    cy.getByTestId('firstname-input').focus()
    cy.getByTestId('lastname-input').focus() // Blur firstname

    cy.getByTestId('firstname-state').should('contain', 'isTouched: true')
  })

  it('should show validation errors from controller fieldState', () => {
    cy.getByTestId('submit-button').click()

    cy.expectError('firstname-error', 'First name must be at least 2 characters')
    cy.expectError('lastname-error', 'Last name must be at least 2 characters')
    cy.expectError('email-error', 'Invalid email')
  })

  it('should clear errors when valid data is entered', () => {
    cy.getByTestId('submit-button').click()
    cy.getByTestId('firstname-error').should('be.visible')

    cy.fillInput('firstname-input', 'John')
    cy.fillInput('lastname-input', 'Doe')
    cy.fillInput('email-input', 'john@example.com')

    cy.getByTestId('submit-button').click()

    cy.getByTestId('firstname-error').should('not.exist')
    cy.getByTestId('submitted-data').should('contain', 'John')
  })

  it('should work with v-model binding (immediate value reflection)', () => {
    cy.fillInput('firstname-input', 'Jane')

    // Value should be reflected immediately due to v-model
    cy.expectValue('firstname-input', 'Jane')
  })

  it('should submit successfully with valid data', () => {
    cy.fillInput('firstname-input', 'Alice')
    cy.fillInput('lastname-input', 'Wonder')
    cy.fillInput('email-input', 'alice@example.com')

    cy.getByTestId('submit-button').click()

    cy.getByTestId('submitted-data')
      .should('contain', 'Alice')
      .and('contain', 'Wonder')
      .and('contain', 'alice@example.com')
  })

  it('should track all field states independently', () => {
    // Touch only firstname
    cy.getByTestId('firstname-input').focus().blur()

    cy.getByTestId('firstname-state').should('contain', 'isTouched: true')
    cy.getByTestId('lastname-state').should('contain', 'isTouched: false')
    cy.getByTestId('email-state').should('contain', 'isTouched: false')

    // Dirty only lastname
    cy.fillInput('lastname-input', 'Test')

    cy.getByTestId('firstname-state').should('contain', 'isDirty: false')
    cy.getByTestId('lastname-state').should('contain', 'isDirty: true')
    cy.getByTestId('email-state').should('contain', 'isDirty: false')
  })
})
