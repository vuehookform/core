describe('Form Context', () => {
  beforeEach(() => {
    cy.visit('/form-context')
  })

  it('should display all fields including nested component fields', () => {
    cy.getByTestId('parent-field').should('be.visible')
    cy.getByTestId('child-field').should('be.visible')
    cy.getByTestId('grandchild-field').should('be.visible')
  })

  it('should register fields from child components via useFormContext', () => {
    cy.fillInput('parent-field', 'Parent Value')
    cy.fillInput('child-field', 'Child Value')
    cy.fillInput('grandchild-field', 'Grandchild Value')

    cy.getByTestId('submit-button').click()

    cy.getByTestId('submitted-data')
      .should('contain', 'Parent Value')
      .and('contain', 'Child Value')
      .and('contain', 'Grandchild Value')
  })

  it('should show validation errors for all nested component fields', () => {
    cy.getByTestId('submit-button').click()

    cy.expectError('parent-field-error', 'Parent field must be at least 2 characters')
    cy.expectError('child-field-error', 'Child field must be at least 2 characters')
    cy.expectError('grandchild-field-error', 'Grandchild field must be at least 2 characters')
  })

  it('should track form state across all nested components', () => {
    cy.expectText('is-dirty', 'false')

    // Modify child component field
    cy.fillInput('child-field', 'test')

    cy.expectText('is-dirty', 'true')
  })

  it('should track error count across all components', () => {
    cy.expectText('error-count', '0')

    cy.getByTestId('submit-button').click()

    cy.expectText('error-count', '3')

    // Fix one error
    cy.fillInput('parent-field', 'Valid')
    cy.getByTestId('submit-button').click()

    cy.expectText('error-count', '2')
  })

  it('should clear errors when all fields are valid', () => {
    cy.getByTestId('submit-button').click()
    cy.expectText('error-count', '3')

    cy.fillInput('parent-field', 'Valid Parent')
    cy.fillInput('child-field', 'Valid Child')
    cy.fillInput('grandchild-field', 'Valid Grandchild')

    cy.getByTestId('submit-button').click()

    cy.expectText('error-count', '0')
    cy.getByTestId('submitted-data').should('be.visible')
  })

  it('should maintain form validity state', () => {
    cy.expectText('is-valid', 'true') // Initially true (no errors yet)

    cy.getByTestId('submit-button').click()

    cy.expectText('is-valid', 'false')

    cy.fillInput('parent-field', 'Valid Parent')
    cy.fillInput('child-field', 'Valid Child')
    cy.fillInput('grandchild-field', 'Valid Grandchild')

    cy.getByTestId('submit-button').click()

    cy.expectText('is-valid', 'true')
  })
})
