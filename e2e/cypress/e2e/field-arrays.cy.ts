describe('Field Arrays', () => {
  beforeEach(() => {
    cy.visit('/field-arrays')
  })

  it('should display initial address field', () => {
    cy.getByTestId('address-0').should('be.visible')
    cy.expectText('array-length', '1')
  })

  it('should add new address on append', () => {
    cy.getByTestId('add-address').click()

    cy.getByTestId('address-1').should('be.visible')
    cy.expectText('array-length', '2')
  })

  it('should remove address correctly', () => {
    cy.getByTestId('add-address').click()
    cy.getByTestId('add-address').click()

    cy.expectText('array-length', '3')

    cy.getByTestId('remove-1').click()

    cy.expectText('array-length', '2')
  })

  it('should swap addresses', () => {
    // Add second address with distinct values
    cy.getByTestId('add-address').click()

    cy.fillInput('street-0', '123 First St')
    cy.fillInput('street-1', '456 Second St')

    cy.getByTestId('swap-addresses').click()

    // After swap, values should be exchanged
    cy.expectValue('street-0', '456 Second St')
    cy.expectValue('street-1', '123 First St')
  })

  it('should move address from last to first', () => {
    cy.getByTestId('add-address').click()
    cy.getByTestId('add-address').click()

    cy.fillInput('street-0', 'First')
    cy.fillInput('street-1', 'Second')
    cy.fillInput('street-2', 'Third')

    cy.getByTestId('move-address').click()

    cy.expectValue('street-0', 'Third')
    cy.expectValue('street-1', 'First')
    cy.expectValue('street-2', 'Second')
  })

  it('should maintain stable keys across operations', () => {
    cy.getByTestId('add-address').click()

    // Get initial keys
    cy.getByTestId('array-keys')
      .invoke('text')
      .then((initialKeys) => {
        // Fill in data
        cy.fillInput('street-0', 'Test Street')

        // Keys should remain stable after input
        cy.getByTestId('array-keys').should('have.text', initialKeys)
      })
  })

  it('should submit with all addresses', () => {
    cy.fillInput('name-input', 'John Doe')
    cy.fillInput('street-0', '123 Main St')
    cy.fillInput('city-0', 'New York')
    cy.fillInput('zipcode-0', '10001')

    cy.getByTestId('add-address').click()

    cy.fillInput('street-1', '456 Oak Ave')
    cy.fillInput('city-1', 'Los Angeles')
    cy.fillInput('zipcode-1', '90001')

    cy.getByTestId('submit-button').click()

    cy.getByTestId('submitted-data')
      .should('contain', '123 Main St')
      .and('contain', '456 Oak Ave')
      .and('contain', 'John Doe')
  })

  it('should validate all addresses on submit', () => {
    cy.fillInput('name-input', 'John Doe')
    // Leave address fields empty

    cy.getByTestId('submit-button').click()

    // Form should not submit due to validation errors
    cy.getByTestId('submitted-data').should('not.exist')
  })

  it('should not allow removing the last address', () => {
    cy.expectText('array-length', '1')
    cy.getByTestId('remove-0').click()

    // Should still have exactly one address - last item cannot be removed
    cy.expectText('array-length', '1')
    cy.getByTestId('address-0').should('exist')
  })

  it('should disable swap button when less than 2 addresses', () => {
    cy.getByTestId('swap-addresses').should('be.disabled')

    cy.getByTestId('add-address').click()
    cy.getByTestId('swap-addresses').should('not.be.disabled')

    cy.getByTestId('remove-1').click()
    cy.getByTestId('swap-addresses').should('be.disabled')
  })
})
