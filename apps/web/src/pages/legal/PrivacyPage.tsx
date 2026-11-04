import { Link } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'

/** RGPD-2 — politique de confidentialité (reprend docs/rgpd.md). */
export function PrivacyPage() {
  return (
    <MainLayout>
      <article className="tp-prose" style={{ maxWidth: 820 }}>
        <h1 style={{ fontSize: 'var(--text-3xl)' }}>Politique de confidentialité</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Dernière mise à jour : 4 novembre 2026</p>

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
          <li><strong>Position</strong> — utilisée uniquement pendant la recherche de producteurs, jamais enregistrée
            pour les consommateurs. Les producteurs publient volontairement l'adresse de leur exploitation.</li>
          <li><strong>Assistant IA</strong> — vos questions sont envoyées à Google Gemini pour générer la réponse,
            sans votre nom ni votre email. N'y indiquez pas d'informations personnelles.</li>
        </ul>

        <h2>Où sont-elles hébergées ?</h2>
        <p>
          Chez OVHcloud, en France. La base de données n'est pas accessible depuis Internet ; tous les échanges
          sont chiffrés (HTTPS).
        </p>

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
          TerraProxi n'utilise ni cookie publicitaire ni traceur. Votre session et votre panier sont gardés dans
          le stockage local de votre navigateur, uniquement pour le fonctionnement du service.
        </p>
      </article>
    </MainLayout>
  )
}
