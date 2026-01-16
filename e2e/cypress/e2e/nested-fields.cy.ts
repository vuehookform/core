describe('Nested Fields', () => {
  beforeEach(() => {
    cy.visit('/nested')
  })

  it('should display all nested fields', () => {
    cy.getByTestId('user-firstname').should('be.visible')
    cy.getByTestId('user-lastname').should('be.visible')
    cy.getByTestId('user-email').should('be.visible')
    cy.getByTestId('user-phone').should('be.visible')
    cy.getByTestId('company-name').should('be.visible')
    cy.getByTestId('company-street').should('be.visible')
    cy.getByTestId('company-city').should('be.visible')
    cy.getByTestId('company-country').should('be.visible')
  })

  it('should show validation errors for nested fields', () => {
    cy.getByTestId('submit-button').click()

    cy.expectError('user-firstname-error', 'First name is required')
    cy.expectError('user-lastname-error', 'Last name is required')
    cy.expectError('user-email-error', 'Invalid email')
    cy.expectError('user-phone-error', 'Phone must be at least 10 characters')
    cy.expectError('company-name-error', 'Company name is required')
    cy.expectError('company-street-error', 'Street is required')
    cy.expectError('company-city-error', 'City is required')
    cy.expectError('company-country-error', 'Country is required')
  })

  it('should submit successfully with all nested fields filled', () => {
    cy.fillInput('user-firstname', 'John')
    cy.fillInput('user-lastname', 'Doe')
    cy.fillInput('user-email', 'john@example.com')
    cy.fillInput('user-phone', '1234567890')
    cy.fillInput('company-name', 'Acme Corp')
    cy.fillInput('company-street', '123 Business Ave')
    cy.fillInput('company-city', 'San Francisco')
    cy.fillInput('company-country', 'USA')

    cy.getByTestId('submit-button').click()

    cy.getByTestId('submitted-data')
      .should('contain', 'John')
      .and('contain', 'Doe')
      .and('contain', 'john@example.com')
      .and('contain', 'Acme Corp')
      .and('contain', 'San Francisco')
  })

  it('should get current values via getValues', () => {
    cy.fillInput('user-firstname', 'Jane')
    cy.fillInput('user-lastname', 'Smith')
    cy.fillInput('company-name', 'TechCo')

    cy.getByTestId('show-values-button').click()

    cy.getByTestId('current-values')
      .should('contain', 'Jane')
      .and('contain', 'Smith')
      .and('contain', 'TechCo')
  })

  it('should preserve nested structure in submitted data', () => {
    cy.fillInput('user-firstname', 'Test')
    cy.fillInput('user-lastname', 'User')
    cy.fillInput('user-email', 'test@test.com')
    cy.fillInput('user-phone', '9876543210')
    cy.fillInput('company-name', 'Test Inc')
    cy.fillInput('company-street', '1 Test St')
    cy.fillInput('company-city', 'Test City')
    cy.fillInput('company-country', 'Testland')

    cy.getByTestId('submit-button').click()

    // Verify actual nested structure by parsing JSON
    cy.getByTestId('submitted-data')
      .invoke('text')
      .then((text) => {
        const data = JSON.parse(text)
        expect(data).to.have.nested.property('user.firstName', 'Test')
        expect(data).to.have.nested.property('user.lastName', 'User')
        expect(data).to.have.nested.property('user.contact.email', 'test@test.com')
        expect(data).to.have.nested.property('user.contact.phone', '9876543210')
        expect(data).to.have.nested.property('company.name', 'Test Inc')
        expect(data).to.have.nested.property('company.address.street', '1 Test St')
        expect(data).to.have.nested.property('company.address.city', 'Test City')
        expect(data).to.have.nested.property('company.address.country', 'Testland')
      })
  })
})
