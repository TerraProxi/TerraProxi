import { Link } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'

/** RGPD-2 — politique de confidentialité (reprend docs/rgpd.md). */
export function PrivacyPage() {
  return (
    <MainLayout title="Politique de confidentialité">
      <article className="tp-prose" style={{ maxWidth: 820 }}>
        <h1 className="tp-page-title" style={{ marginBottom: 'var(--space-2)' }}>Politique de confidentialité</h1>
        <p className="tp-muted">Dernière mise à jour : 5 novembre 2026</p>

        <h2>Qui traite vos données ?</h2>
        <p>
          TerraProxi, projet étudiant de l'EPSI Montpellier (Gaëtan Faucher, Théo Freihuber,
          Dunvael Le Roux, Mylo Wierez). Contact : <a href="mailto:dpo@terraproxi.fr">dpo@terraproxi.fr</a>.
        </p>

        <h2>Quelles données et pourquoi ?</h2>
        <ul>
          <li><strong>Compte</strong> — nom, email, mot de passe chiffré (bcrypt), rôle, date du consentement :
            pour vous identifier. Base légale : votre consentement. Conservées jusqu'à la suppression du compte.</li>
          <li><strong>Commandes</strong> — produits, montants, statut, mode de retrait : pour exécuter la vente.
            Base légale : le contrat. Conservées 10 ans (obligation comptable), anonymisées si vous supprimez votre compte.</li>
          <li><strong>Paiement</strong> — seule la référence de transaction Stripe est conservée.
            Vos données de carte sont saisies chez Stripe (certifié PCI-DSS) et ne transitent jamais par nos serveurs.</li>
          <li><strong>Messages</strong> — contenu et date : pour échanger avec les producteurs.
            Supprimés avec votre compte.</li>
          <li><strong>Notifications et newsletters</strong> — suivi de vos commandes et messages ; les newsletters des
            producteurs chez qui vous avez commandé ne vous parviennent que si vous l'avez accepté (case retirable à
            tout moment dans « Mon compte »).</li>
          <li><strong>Photos</strong> — celles que les producteurs publient (produits, couverture) sont hébergées par
            TerraProxi et supprimées avec leur compte.</li>
          <li><strong>Position</strong> — utilisée uniquement pendant la recherche de producteurs, jamais enregistrée
            pour les consommateurs. Les producteurs publient volontairement l'adresse de leur exploitation.</li>
          <li><strong>Assistant IA</strong> — vos questions, le contenu de votre panier et, seulement si vous l'activez,
            votre position servent à générer la réponse avec Google Gemini, sans votre nom ni votre email.
            N'y indiquez pas d'informations personnelles.</li>
        </ul>

        <h2>Où sont-elles hébergées ?</h2>
        <p>
          Chez OVHcloud, en France. La base de données n'est pas accessible depuis Internet ; tous les échanges
          sont chiffrés (HTTPS).
        </p>

        <h2>Services tiers appelés par votre navigateur</h2>
        <p>
          Certaines fonctions du site chargent des ressources chez des tiers. Comme pour toute requête web,
          ces services reçoivent alors l'adresse IP de votre appareil et les informations techniques du navigateur :
        </p>
        <ul>
          <li><strong>Google Fonts</strong> (Google LLC) — polices d'affichage Montserrat et Open Sans, chargées sur
            chaque page.</li>
          <li><strong>OpenStreetMap</strong> (OpenStreetMap Foundation) — fonds de carte, chargés lorsque vous affichez
            une carte : les tuiles demandées révèlent la zone consultée.</li>
          <li><strong>Base Adresse Nationale</strong> (api-adresse.data.gouv.fr, service public) — appelée uniquement
            quand un producteur localise l'adresse de son exploitation ; seule l'adresse saisie est transmise.</li>
          <li><strong>Stripe</strong> — formulaire de paiement chargé uniquement sur la page de paiement.</li>
        </ul>
        <p>Aucun de ces services ne reçoit votre nom, votre email ni le contenu de votre compte.</p>

        <h2>Vos droits</h2>
        <p>Depuis la page <Link to="/account">Mon compte</Link>, vous pouvez à tout moment :</p>
        <ul>
          <li>consulter et corriger vos informations (droit d'accès et de rectification) ;</li>
          <li>télécharger toutes vos données au format JSON (droit à la portabilité) ;</li>
          <li>supprimer votre compte (droit à l'effacement).</li>
        </ul>
        <p>
          Pour toute autre demande, écrivez à <a href="mailto:dpo@terraproxi.fr">dpo@terraproxi.fr</a>.
          Vous pouvez aussi saisir la <a href="https://www.cnil.fr" target="_blank" rel="noreferrer">CNIL</a>.
        </p>

        <h2>Cookies</h2>
        <p>
          TerraProxi n'utilise ni cookie publicitaire ni traceur. Votre session et votre panier (produits et
          quantités, sans adresse) sont gardés dans le stockage local de votre navigateur, uniquement pour le
          fonctionnement du service ; le panier y reste jusqu'à votre commande ou jusqu'à ce que vous le vidiez.
        </p>
      </article>
    </MainLayout>
  )
}
