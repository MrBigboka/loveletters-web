describe('Home Page', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000')
  })

  it('displays the title and buttons', () => {
    cy.contains('h1', 'Love Letter')
    cy.contains('button', 'Créer une partie')
    cy.contains('button', 'Rejoindre une partie')
  })

  it('navigates to create game page when create button is clicked', () => {
    cy.contains('button', 'Créer une partie').click()
    cy.url().should('include', '/lobby/create')
    cy.contains('h1', 'Créer une partie')
  })

  it('navigates to join game page when join button is clicked', () => {
    cy.contains('button', 'Rejoindre une partie').click()
    cy.url().should('include', '/lobby/join')
    cy.contains('h1', 'Rejoindre une partie')
  })
})
