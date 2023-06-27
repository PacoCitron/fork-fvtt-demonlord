import {DLEndOfRound} from '../dialog/endofround.js'
import {i18n} from "../utils/utils";
import {createInitChatMessage} from "./combat";
import {injectDraggable} from "./combat-tracker-draggable";

export class DLCombatTracker extends CombatTracker {
  constructor(options) {
    super(options)
  }

  async getData() {
    return await super.getData()
  }

  /** @override */
  activateListeners(html) {
    let init
    let hasEndOfRoundEffects = false
    const currentCombat = this.getCurrentCombat()
    const combatants = currentCombat?.combatants

    html.find('.combatant').each((i, el) => {
      // For each combatant in the tracker, change the initiative selector
      const combId = el.getAttribute('data-combatant-id')
      const combatant = combatants.get(combId)
      if (!combatant) return

      init = combatant.actor?.system.fastturn
        ? game.i18n.localize('DL.TurnFast')
        : game.i18n.localize('DL.TurnSlow')

      el.getElementsByClassName('token-initiative')[0].innerHTML =
        `<a class="combatant-control dlturnorder" title="${i18n('DL.TurnChangeTurn')}">${init}</a>`

      // Add Tooltip on Status Effects
      // Group actor effects by image
      const imgEffectMap = new Map()
      combatant.actor.effects
        .filter(e => e.isTemporary && !e.disabled)
        .forEach(e => {
          if (imgEffectMap.has(e.icon)) imgEffectMap.get(e.icon).push(e)
          else imgEffectMap.set(e.icon, [e])
        })

      // Get effects displayed in the combat tracker and add the relevant data to the html,
      const htmlEffectsCollection = el.getElementsByClassName('token-effects')[0].children

      for (let j = 0; j < htmlEffectsCollection.length; j++) {
        const htmlEffect = htmlEffectsCollection[j]
        const img = htmlEffect.attributes.getNamedItem('src').value
        const match = imgEffectMap.get(img)?.pop()
        if (!match) continue

        let tooltiptext = ': ' + game.i18n.localize('DL.Afflictions' + match.label)
        tooltiptext = tooltiptext.indexOf('DL.Afflictions') === -1 ? tooltiptext : ''
        htmlEffect.outerHTML =
          `<div class="tooltipEffect tracker-effect" data-effect-uuid="${match.uuid}">${htmlEffect.outerHTML}
            <span class="tooltiptextEffect">${match.label}${tooltiptext}</span>
           </div>`
        // htmlEffect.addEventListener('click', ev => (ev.button == "2") ? match.delete() : null)
        // ^ does not work, probably the event gets intercepted
      }

      const endofrounds = combatant.actor.getEmbeddedCollection('Item').filter(e => e.type === 'endoftheround')
      if (endofrounds.length > 0) hasEndOfRoundEffects = true
    })

    html.find('.tracker-effect').click(ev => {
      if (!game.user.isGM) return
      const effectUUID = ev.currentTarget.attributes.getNamedItem('data-effect-uuid').value
      fromUuid(effectUUID).then(effect =>
        effect.statuses ? effect.delete() : effect.update({disabled: true})
      )
    })

    super.activateListeners(html)

    html.find('.dlturnorder').click(async ev => {
      const li = ev.currentTarget.closest('li')
      const combId = li.dataset.combatantId
      const combatant = combatants.get(combId)
      if (!combatant) return

      if (game.user.isGM || combatant.actor.isOwner) {
        await combatant.actor.update({'system.fastturn': !combatant.actor.system.fastturn})
        const initChatMessage = await createInitChatMessage(combatant, {})
        if (initChatMessage) ChatMessage.create(initChatMessage)
      }
    })

    // Add "End of the Round" to the Combat Tracker
    if (hasEndOfRoundEffects && game.user.isGM) {
      html
        .find('#combat-tracker')
        .append(
          `<li id="combat-endofround" class="combatant actor directory-item flexrow">
             <img class="token-image" src="systems/demonlord/assets/ui/icons/pentragram.webp"/>
             <div class="token-name flexcol"><h4>${i18n("DL.CreatureSpecialEndRound")}</h4></div>
           </li>`,
        )
    }

    // End of the round click
    html.find('#combat-endofround').click(_ev => {
      new DLEndOfRound(this.getCurrentCombat(), {
        top: 50,
        right: 700,
      }).render(true)
    })

    // Draggable
    injectDraggable(html, this)
  }

  getCurrentCombat() {
    return this.viewed
  }
}

export function _onUpdateCombat(combatData, _updateData, _options, _userId) {
  // TODO: DELETE
  // Do this only if the user is GM to avoid multiple operations
  if (!game.user.isGM && game.user.id !== _userId) return

  const isRoundAdvanced = combatData?.current?.round - combatData?.previous?.round > 0
  const actors = combatData.combatants.map(c => c.actor)

  // Todo: maybe add some memory to remember what has been deactivated in last round?
  for (let actor of actors) {
    // Deactivate temporary talents if the round has advanced.
    // If the round is decreased, there is no way to determine what to activate
    if (isRoundAdvanced) {
      actor.items
        .filter(i => i.type === 'talent')
        .forEach(t => actor.deactivateTalent(t, 0, true))
    }
  }
}

