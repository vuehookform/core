/// <reference types="cypress" />

Cypress.Commands.add('getByTestId', (testId: string) => {
  return cy.get(`[data-testid="${testId}"]`)
})

Cypress.Commands.add('fillInput', (testId: string, value: string) => {
  cy.getByTestId(testId).clear().type(value)
})

Cypress.Commands.add('clearInput', (testId: string) => {
  cy.getByTestId(testId).clear()
})

Cypress.Commands.add('submitForm', (formTestId: string) => {
  cy.getByTestId(formTestId).submit()
})

Cypress.Commands.add('expectError', (testId: string, message: string) => {
  cy.getByTestId(testId).should('be.visible').and('contain', message)
})

Cypress.Commands.add('expectNoError', (testId: string) => {
  cy.getByTestId(testId).should('not.exist')
})

Cypress.Commands.add('expectValue', (testId: string, value: string) => {
  cy.getByTestId(testId).should('have.value', value)
})

Cypress.Commands.add('expectText', (testId: string, text: string) => {
  cy.getByTestId(testId).should('contain', text)
})

// Fill input and blur - useful for validation mode testing
Cypress.Commands.add('fillAndBlur', (testId: string, value: string) => {
  cy.getByTestId(testId).clear().type(value).blur()
})

// Select option from PrimeVue dropdown (with wait for panel to open and close)
Cypress.Commands.add('selectDropdownOption', (dropdownTestId: string, optionText: string) => {
  cy.getByTestId(dropdownTestId).click()
  cy.get('.p-select-list, .p-listbox-list').should('be.visible')
  cy.contains('.p-select-option, .p-listbox-option, li', optionText).click()
  // Wait for dropdown panel to close before proceeding
  cy.get('.p-select-list, .p-listbox-list').should('not.exist')
})

// Select date from PrimeVue DatePicker (with wait for panel to open and close)
Cypress.Commands.add(
  'selectDate',
  (calendarTestId: string, dateSelector: string = '.p-datepicker-today') => {
    cy.getByTestId(calendarTestId).click()
    cy.get('.p-datepicker-panel').should('be.visible')
    cy.get(dateSelector).click()
    // Wait for datepicker panel to close before proceeding
    cy.get('.p-datepicker-panel').should('not.exist')
  },
)

// Fill nested input (for wrapped components like Password)
Cypress.Commands.add('fillNestedInput', (testId: string, value: string) => {
  cy.getByTestId(testId).find('input').clear().type(value)
})

// Fill PrimeVue InputNumber (focus, clear, type, blur for proper value binding)
Cypress.Commands.add('fillInputNumber', (testId: string, value: string) => {
  cy.getByTestId(testId).find('input').focus().clear().type(value, { delay: 0 }).blur()
})

// Expect PrimeVue toast message
Cypress.Commands.add('expectToast', (severity: 'success' | 'error', message: string) => {
  cy.get(`.p-toast-message-${severity}`).should('be.visible').and('contain', message)
})

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      getByTestId(testId: string): Chainable<JQuery<HTMLElement>>
      fillInput(testId: string, value: string): Chainable<void>
      clearInput(testId: string): Chainable<void>
      submitForm(formTestId: string): Chainable<void>
      expectError(testId: string, message: string): Chainable<void>
      expectNoError(testId: string): Chainable<void>
      expectValue(testId: string, value: string): Chainable<void>
      expectText(testId: string, text: string): Chainable<void>
      fillAndBlur(testId: string, value: string): Chainable<void>
      selectDropdownOption(dropdownTestId: string, optionText: string): Chainable<void>
      selectDate(calendarTestId: string, dateSelector?: string): Chainable<void>
      fillNestedInput(testId: string, value: string): Chainable<void>
      fillInputNumber(testId: string, value: string): Chainable<void>
      expectToast(severity: 'success' | 'error', message: string): Chainable<void>
    }
  }
}

export {}
