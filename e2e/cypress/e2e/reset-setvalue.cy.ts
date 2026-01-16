describe('Reset & setValue', () => {
  beforeEach(() => {
    cy.visit('/reset-setvalue')
  })

  it('should display form with default values', () => {
    cy.expectValue('firstname-input', 'John')
    cy.expectValue('lastname-input', 'Doe')
    cy.expectValue('email-input', 'john@example.com')
  })

  describe('reset()', () => {
    it('should reset to default values', () => {
      // Modify all fields
      cy.clearInput('firstname-input')
      cy.fillInput('firstname-input', 'Modified')
      cy.clearInput('lastname-input')
      cy.fillInput('lastname-input', 'Values')
      cy.clearInput('email-input')
      cy.fillInput('email-input', 'modified@example.com')

      cy.expectText('is-dirty', 'true')

      // Reset
      cy.getByTestId('reset-default').click()

      // Should be back to defaults
      cy.expectValue('firstname-input', 'John')
      cy.expectValue('lastname-input', 'Doe')
      cy.expectValue('email-input', 'john@example.com')
      cy.expectText('is-dirty', 'false')
    })

    it('should reset to custom values', () => {
      cy.getByTestId('reset-custom').click()

      cy.expectValue('firstname-input', 'Jane')
      cy.expectValue('lastname-input', 'Smith')
      cy.expectValue('email-input', 'jane@example.com')
    })

    it('should clear submitted data on reset', () => {
      cy.getByTestId('submit-button').click()
      cy.getByTestId('submitted-data').should('be.visible')

      cy.getByTestId('reset-default').click()
      cy.getByTestId('submitted-data').should('not.exist')
    })

    it('should reset submit count', () => {
      cy.getByTestId('submit-button').click()
      cy.expectText('submit-count', '1')

      cy.getByTestId('reset-default').click()
      cy.expectText('submit-count', '0')
    })
  })

  describe('resetField()', () => {
    it('should reset only the specified field', () => {
      cy.clearInput('firstname-input')
      cy.fillInput('firstname-input', 'Modified')
      cy.clearInput('lastname-input')
      cy.fillInput('lastname-input', 'Also Modified')

      cy.getByTestId('reset-firstname').click()

      // First name should be reset
      cy.expectValue('firstname-input', 'John')
      // Last name should still be modified
      cy.expectValue('lastname-input', 'Also Modified')
    })

    it('should clear dirty state for only the reset field', () => {
      cy.clearInput('firstname-input')
      cy.fillInput('firstname-input', 'Modified')
      cy.clearInput('lastname-input')
      cy.fillInput('lastname-input', 'Also Modified')

      cy.getByTestId('dirty-fields').should('contain', 'firstName')
      cy.getByTestId('dirty-fields').should('contain', 'lastName')

      cy.getByTestId('reset-firstname').click()

      cy.getByTestId('dirty-fields').should('not.contain', 'firstName')
      cy.getByTestId('dirty-fields').should('contain', 'lastName')
    })
  })

  describe('setValue()', () => {
    it('should set email value programmatically', () => {
      cy.getByTestId('set-email').click()

      cy.expectValue('email-input', 'updated@example.com')
    })

    it('should set all values programmatically', () => {
      cy.getByTestId('set-all').click()

      cy.expectValue('firstname-input', 'Alice')
      cy.expectValue('lastname-input', 'Wonder')
      cy.expectValue('email-input', 'alice@example.com')
    })

    it('should mark fields as dirty after setValue', () => {
      cy.expectText('dirty-fields', 'none')

      cy.getByTestId('set-email').click()

      cy.expectText('dirty-fields', 'email')
    })

    it('should allow submission with programmatically set values', () => {
      cy.getByTestId('set-all').click()
      cy.getByTestId('submit-button').click()

      cy.getByTestId('submitted-data')
        .should('contain', 'Alice')
        .and('contain', 'Wonder')
        .and('contain', 'alice@example.com')
    })
  })

  describe('getValues()', () => {
    it('should retrieve current form values', () => {
      cy.clearInput('firstname-input')
      cy.fillInput('firstname-input', 'CurrentFirst')
      cy.clearInput('email-input')
      cy.fillInput('email-input', 'current@example.com')

      cy.getByTestId('get-values').click()

      cy.getByTestId('current-values')
        .should('contain', 'CurrentFirst')
        .and('contain', 'Doe') // lastname unchanged
        .and('contain', 'current@example.com')
    })
  })
})
