describe('Controlled Inputs', () => {
  beforeEach(() => {
    cy.visit('/controlled')
  })

  it('should display all controlled input fields', () => {
    cy.getByTestId('country-dropdown').should('be.visible')
    cy.getByTestId('birthdate-calendar').should('be.visible')
    cy.getByTestId('age-input').should('be.visible')
    cy.getByTestId('submit-button').should('be.visible')
  })

  it('should show validation errors on submit with empty fields', () => {
    cy.getByTestId('submit-button').click()

    cy.expectError('country-error', 'Please select a country')
    cy.expectError('birthdate-error', 'Please select a birth date')
    cy.expectError('age-error', 'Age is required')
  })

  it('should select country from dropdown', () => {
    // Select an option using the new command that waits for panel
    cy.selectDropdownOption('country-dropdown', 'United States')

    // Submit to verify value was set
    cy.getByTestId('submit-button').click()

    // Country error should be gone
    cy.getByTestId('country-error').should('not.exist')
  })

  it('should show error for age under 18', () => {
    // Select country
    cy.selectDropdownOption('country-dropdown', 'Germany')

    // Set birth date (with wait for panel to be visible)
    cy.selectDate('birthdate-calendar')

    // Set age to 16
    cy.fillInputNumber('age-input', '16')

    cy.getByTestId('submit-button').click()

    cy.expectError('age-error', 'Must be at least 18 years old')
  })

  it('should submit successfully with valid controlled inputs', () => {
    // Select country
    cy.selectDropdownOption('country-dropdown', 'France')

    // Set birth date (with wait for panel to be visible)
    cy.selectDate('birthdate-calendar')

    // Set valid age
    cy.fillInputNumber('age-input', '25')

    cy.getByTestId('submit-button').click()

    cy.getByTestId('submitted-data').should('contain', 'FR')
    cy.getByTestId('submitted-data').should('contain', '25')
  })
})
