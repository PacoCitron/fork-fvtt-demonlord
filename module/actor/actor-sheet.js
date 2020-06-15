/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class DemonlordActorSheet extends ActorSheet {

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["demonlord", "sheet", "actor"],
            template: "systems/demonlord/templates/actor/actor-sheet.html",
            width: 610,
            height: 700,
            tabs: [{
                navSelector: ".sheet-tabs",
                contentSelector: ".sheet-body",
                initial: "combat"
            }]
        });
    }

    /* -------------------------------------------- */

    /** @override */
    getData() {
        const data = super.getData();
        data.dtypes = ["String", "Number", "Boolean"];
        for (let attr of Object.values(data.data.attributes)) {
            attr.isCheckbox = attr.dtype === "Boolean";
        }

        // Prepare items.
        if (this.actor.data.type == 'character') {
            this._prepareCharacterItems(data);
            this._prepareSpellBook(data.actor);
        }

        return data;
    }

    /**
     * Organize and classify Items for Character sheets.
     *
     * @param {Object} actorData The actor to prepare.
     *
     * @return {undefined}
     */
    _prepareCharacterItems(sheetData) {
        const actorData = sheetData.actor;

        // Initialize containers.
        const gear = [];
        const features = [];
        const spells = [];
        const weapons = [];
        const armor = [];
        const ammo = [];
        const talents = [];

        // Iterate through items, allocating to containers
        // let totalWeight = 0;
        for (let i of sheetData.items) {
            let item = i.data;
            i.img = i.img || DEFAULT_TOKEN;

            // Append to gear.
            if (i.type === 'item') {
                gear.push(i);
            }
            // Append to features.
            else if (i.type === 'feature') {
                features.push(i);
            }
            // Append to spells.
            else if (i.type === 'spell') {
                spells.push(i);
            }
            // Append to weapons.
            else if (i.type === 'weapon') {
                weapons.push(i);
            }
            // Append to armor.
            else if (i.type === 'armor') {
                armor.push(i);
            }
            // Append to ammo.
            else if (i.type === 'ammo') {
                ammo.push(i);
            } // Append to ammo.
            else if (i.type === 'talent') {
                talents.push(i);
            }
        }

        // Assign and return
        actorData.gear = gear;
        actorData.features = features;
        actorData.spells = spells;
        actorData.weapons = weapons;
        actorData.armor = armor;
        actorData.ammo = ammo;
        actorData.talents = talents;
    }

    /* -------------------------------------------- */

    _prepareSpellBook(actorData) {
        var dictTraditions = [];
        var dictSpells = [];

        for (let spell of actorData.spells) {
            if (spell.data.traditionid) {
                let tradition = this.actor.getOwnedItem(spell.data.traditionid);
                if (tradition) {
                    dictTraditions[spell.data.traditionid] = tradition;
                    dictSpells.push(spell);
                }
            } else {
                dictTraditions[spell._id] = spell;
            }
        }

        actorData.spells = [];

        for (let [key, tradition] of Object.entries(dictTraditions)) {
            actorData.spells.push(tradition);

            for (let spell of dictSpells) {
                if (key == spell.data.traditionid) {
                    actorData.spells.push(spell);
                }
            }
        }
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return;

        // Edit Creature
        html.find('.creature-edit').click(ev => {
            const actor = this.actor;

            let showEdit = actor.data.data.edit;
            if (showEdit) {
                actor.data.data.edit = false;
            } else {
                actor.data.data.edit = true;
            }

            let that = this;
            actor.update({
                "data.edit": actor.data.data.edit
            }).then(item => {
                that.render();
            });
        });

        // Add Inventory Item
        html.find('.item-create').click(this._onItemCreate.bind(this));

        // Update Inventory Item
        html.find('.item-edit').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            const item = this.actor.getOwnedItem(li.data("itemId"));
            item.sheet.render(true);
        });

        // Delete Inventory Item
        html.find('.item-delete').click(ev => {
            const li = $(ev.currentTarget).parents(".item");

            this.showDeleteDialog(game.i18n.localize('DL.DialogAreYouSure'), game.i18n.localize('DL.DialogDeleteItemText'), li);
        });

        // Update Feature Item
        html.find('.feature-edit').click(ev => {
            const li = $(ev.currentTarget).parents(".feature");
            const item = this.actor.getOwnedItem(li.data("itemId"));
            item.sheet.render(true);
        });

        // Delete Feature Item
        html.find('.feature-delete').click(ev => {
            const li = $(ev.currentTarget).parents(".feature");

            this.showDeleteDialog(game.i18n.localize('DL.DialogAreYouSure'), game.i18n.localize('DL.DialogDeleteFeatureText'), li);
        });

        // Add Tradition Item
        html.find('.tradition-create').click(this._onTraditionCreate.bind(this));

        html.find('.tradition-edit').click(ev => {
            const li = event.currentTarget.closest("li");
            const item = this.actor.getOwnedItem(li.dataset.itemId);

            let showEdit = item.data.data.edit;
            if (showEdit) {
                item.data.data.edit = false;
            } else {
                item.data.data.edit = true;
            }

            let that = this;
            item.update({
                "data.spell.edit": item.data.data.edit
            }).then(item => {
                that.render();
            });
        });

        html.find('.tradition-focus').focusout(ev => {
            let newName = ev.target.value;
            const li = ev.currentTarget.closest("li");
            const item = this.actor.getOwnedItem(li.dataset.itemId);

            let showEdit = item.data.data.edit;
            if (showEdit) {
                item.data.data.edit = false;
            } else {
                item.data.data.edit = true;
            }

            let that = this;
            item.update({
                "name": newName,
                "data.spell.edit": item.data.data.edit
            }).then(item => {
                that.render();
            });
        });

        html.find('.tradition-focus').change(ev => {
            let newName = ev.target.value;
            const li = ev.currentTarget.closest("li");
            const item = this.actor.getOwnedItem(li.dataset.itemId);

            let showEdit = item.data.data.edit;
            if (showEdit) {
                item.data.data.edit = false;
            } else {
                item.data.data.edit = true;
            }

            let that = this;
            item.update({
                "name": newName,
                "data.spell.edit": item.data.data.edit
            }).then(item => {
                that.render();
            });
        });

        html.find('.tradition-delete').click(ev => {
            const li = $(ev.currentTarget).parents("li");

            this.showDeleteDialog(game.i18n.localize('DL.DialogAreYouSure'), game.i18n.localize('DL.DialogDeleteTraditionText'), li);
        });

        // Wealth
        html.find('.wealth-edit').click(ev => {
            const actor = this.actor;

            let showEdit = actor.data.data.wealth.edit;
            if (showEdit) {
                actor.data.data.wealth.edit = false;
            } else {
                actor.data.data.wealth.edit = true;
            }

            let that = this;
            actor.update({
                "data.wealth.edit": actor.data.data.wealth.edit
            }).then(item => {
                that.render();
            });
        });

        // Paths
        html.find('.paths-edit').click(ev => {
            const actor = this.actor;

            let showEdit = actor.data.data.paths.edit;
            if (showEdit) {
                actor.data.data.paths.edit = false;
            } else {
                actor.data.data.paths.edit = true;
            }

            let that = this;
            actor.update({
                "data.paths.edit": actor.data.data.paths.edit
            }).then(item => {
                that.render();
            });
        });

        // Profession
        html.find('.profession-edit').click(ev => {
            const actor = this.actor;

            let showEdit = actor.data.data.professions.edit;
            if (showEdit) {
                actor.data.data.professions.edit = false;
            } else {
                actor.data.data.professions.edit = true;
            }

            let that = this;
            actor.update({
                "data.professions.edit": actor.data.data.professions.edit
            }).then(item => {
                that.render();
            });
        });


        // Religion
        html.find('.religion-edit').click(ev => {
            const actor = this.actor;

            let showEdit = actor.data.data.religion.edit;
            if (showEdit) {
                actor.data.data.religion.edit = false;
            } else {
                actor.data.data.religion.edit = true;
            }

            let that = this;
            actor.update({
                "data.religion.edit": actor.data.data.religion.edit
            }).then(item => {
                that.render();
            });
        });

        // Languages
        html.find('.languages-edit').click(ev => {
            const actor = this.actor;

            let showEdit = actor.data.data.languages.edit;
            if (showEdit) {
                actor.data.data.languages.edit = false;
            } else {
                actor.data.data.languages.edit = true;
            }

            let that = this;
            actor.update({
                "data.languages.edit": actor.data.data.languages.edit
            }).then(item => {
                that.render();
            });
        });

        // Add Spell Item
        html.find('.spell-create').click(this._onSpellCreate.bind(this));

        html.find('.spell-edit').click(ev => {
            const liSpell = $(ev.currentTarget).parents(".item");
            const item = this.actor.getOwnedItem(liSpell.data("itemId"));

            item.sheet.render(true);
        });

        html.find('.spell-delete').click(ev => {
            const li = $(ev.currentTarget).parents(".item");

            this.showDeleteDialog(game.i18n.localize('DL.DialogAreYouSure'), game.i18n.localize('DL.DialogDeleteSpellText'), li);
        });

        // Rollable
        html.find('.rollable').click(this._onRoll.bind(this));

        // Attibute Checks
        html.find('.ability-name').click(ev => {
            let abl = ev.currentTarget.parentElement.getAttribute('data-ability');
            this.actor.rollAbility(abl);
        });

        html.find('.ammo-amount').click(ev => {
            const li = event.currentTarget.closest(".item");
            const item = duplicate(this.actor.getEmbeddedEntity("OwnedItem", li.dataset.itemId))
            let amount = item.data.amount;

            if (amount > 0) {
                item.data.amount = Number(amount) - 1;
            }

            this.actor.updateEmbeddedEntity('OwnedItem', item);
        });

        html.find('.talent-uses').click(ev => {
            const li = event.currentTarget.closest(".item");
            const item = duplicate(this.actor.getEmbeddedEntity("OwnedItem", li.dataset.itemId))
            let uses = item.data.uses.value;
            let usesmax = item.data.uses.max;

            if (uses < usesmax) {
                item.data.uses.value = Number(uses) + 1;
            } else {
                item.data.uses.value = 0;
            }

            this.actor.updateEmbeddedEntity('OwnedItem', item);
        });

        html.find('.spell-uses').click(ev => {
            const li = event.currentTarget.closest(".item");
            const item = duplicate(this.actor.getEmbeddedEntity("OwnedItem", li.dataset.itemId))
            let uses = item.data.castings.value;
            let usesmax = item.data.castings.max;

            if (uses < usesmax) {
                item.data.castings.value = Number(uses) + 1;
            } else {
                item.data.castings.value = 0;
            }

            this.actor.updateEmbeddedEntity('OwnedItem', item);
        });

        // Rollable Attributes
        html.find('.attribute-roll').click(ev => {
            const div = $(ev.currentTarget);
            const attributeName = div.data("key");
            const attribute = this.actor.data.data.attributes[attributeName];
            const attLabel = attribute.label.charAt(0).toUpperCase() + attribute.label.toLowerCase().slice(1);
            let d = new Dialog({
                title: game.i18n.localize('DL.DialogChallengeRoll') + game.i18n.localize(attLabel),
                content: "<b>" + game.i18n.localize('DL.DialogAddBonesAndBanes') + "</b><input style='width: 50px;margin-left: 5px;text-align: center' type='text' value=0 data-dtype='Number'/>",
                buttons: {
                    roll: {
                        icon: '<i class="fas fa-check"></i>',
                        label: game.i18n.localize('DL.DialogRoll'),
                        callback: (html) => this.rollAttribute(attribute, html.children()[1].value)
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: game.i18n.localize('DL.DialogCancel'),
                        callback: () => {}
                    }
                },
                default: "roll",
                close: () => {}
            });
            d.render(true);
        });

        // Rollable Attack
        html.find('.attack-roll').click(ev => {
            const li = event.currentTarget.closest(".item");
            const item = this.actor.getOwnedItem(li.dataset.itemId);

            let d = new Dialog({
                title: game.i18n.localize('DL.DialogAttackRoll') + game.i18n.localize(item.name),
                content: "<b>" + game.i18n.localize('DL.DialogAddBonesAndBanes') + "</b><input style='width: 50px;margin-left: 5px;text-align: center' type='text' value=0 data-dtype='Number'/>",
                buttons: {
                    roll: {
                        icon: '<i class="fas fa-check"></i>',
                        label: game.i18n.localize('DL.DialogRoll'),
                        callback: (html) => this.rollAttack(item, html.children()[1].value)
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: game.i18n.localize('DL.DialogCancel'),
                        callback: () => {}
                    }
                },
                default: "roll",
                close: () => {}
            });
            d.render(true);
        });

        // Rollable Talent
        html.find('.talent-roll').click(ev => {
            const li = event.currentTarget.closest(".item");
            const item = this.actor.getOwnedItem(li.dataset.itemId);
            let attackAttribute = item.data.data.action.attack;

            if (attackAttribute) {
                let d = new Dialog({
                    title: game.i18n.localize('DL.DialogTalentRoll') + game.i18n.localize(item.name),
                    content: "<b>" + game.i18n.localize('DL.DialogAddBonesAndBanes') + "</b><input style='width: 50px;margin-left: 5px;text-align: center' type='text' value=0 data-dtype='Number'/>",
                    buttons: {
                        roll: {
                            icon: '<i class="fas fa-check"></i>',
                            label: game.i18n.localize('DL.DialogRoll'),
                            callback: (html) => this.rollTalent(item, html.children()[1].value)
                        },
                        cancel: {
                            icon: '<i class="fas fa-times"></i>',
                            label: game.i18n.localize('DL.DialogCancel'),
                            callback: () => {}
                        }
                    },
                    default: "roll",
                    close: () => {}
                });
                d.render(true);
            } else {
                this.rollTalent(item, 0);
            }
        });

        // Rollable Attack Spell
        html.find('.magic-roll').click(ev => {
            const li = event.currentTarget.closest(".item");
            const item = this.actor.getOwnedItem(li.dataset.itemId);

            if (item.data.data.spelltype == game.i18n.localize('DL.SpellTypeAttack')) {
                let d = new Dialog({
                    title: game.i18n.localize('DL.DialogSpellRoll') + game.i18n.localize(item.name),
                    content: "<b>" + game.i18n.localize('DL.DialogAddBonesAndBanes') + "</b><input style='width: 50px;margin-left: 5px;text-align: center' type='text' value=0 data-dtype='Number'/>",
                    buttons: {
                        roll: {
                            icon: '<i class="fas fa-check"></i>',
                            label: game.i18n.localize('DL.DialogRoll'),
                            callback: (html) => this.rollSpell(item, html.children()[1].value)
                        },
                        cancel: {
                            icon: '<i class="fas fa-times"></i>',
                            label: game.i18n.localize('DL.DialogCancel'),
                            callback: () => {}
                        }
                    },
                    default: "roll",
                    close: () => {}
                });
                d.render(true);
            } else {
                this.rollSpell(item, 0)
            }
        });

        html.find('.rest-char').click(ev => {
            // Talents
            const talents = this.actor.getEmbeddedCollection("OwnedItem").filter(e => "talent" === e.type)

            for (let talent of talents) {
                const item = duplicate(this.actor.getEmbeddedEntity("OwnedItem", talent._id))
                item.data.uses.value = 0;

                this.actor.updateEmbeddedEntity("OwnedItem", item);
            }

            // Spells
            const spells = this.actor.getEmbeddedCollection("OwnedItem").filter(e => "spell" === e.type)

            for (let spell of spells) {
                const item = duplicate(this.actor.getEmbeddedEntity("OwnedItem", spell._id))

                item.data.castings.value = 0;

                this.actor.updateEmbeddedEntity("OwnedItem", item);
            }
        });

        // Drag events for macros.
        if (this.actor.owner) {
            let handler = ev => this._onDragItemStart(ev);
            html.find('li.dropitem').each((i, li) => {
                if (li.classList.contains("inventory-header")) return;
                li.setAttribute("draggable", true);
                li.addEventListener("dragstart", handler, false);
            });
        }
    }

    /**
     * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
     * @param {Event} event   The originating click event
     * @private
     */
    _onItemCreate(event) {
        event.preventDefault();
        const header = event.currentTarget;
        // Get the type of item to create.
        const type = header.dataset.type;
        // Grab any data associated with this control.
        const data = duplicate(header.dataset);
        // Initialize a default name.
        const name = `New ${type.capitalize()}`;
        // Prepare the item object.
        const itemData = {
            name: name,
            type: type,
            data: data
        };

        // Remove the type from the dataset since it's in the itemData.type prop.
        delete itemData.data["type"];

        // Finally, create the item!
        return this.actor.createOwnedItem(itemData);
    }

    _onTraditionCreate(event) {
        event.preventDefault();
        const header = event.currentTarget;
        // Get the type of item to create.
        const type = header.dataset.type;
        // Grab any data associated with this control.
        const data = duplicate(header.dataset);
        // Initialize a default name.
        const name = `New Tradition`;
        // Prepare the item object.
        const itemData = {
            name: name,
            type: type,
            data: data
        };

        // Remove the type from the dataset since it's in the itemData.type prop.
        delete itemData.data["type"];
        return this.actor.createOwnedItem(itemData);
    }

    _onSpellCreate(event) {
        event.preventDefault();

        const li = event.currentTarget.closest("li");
        const tradition = this.actor.getOwnedItem(li.dataset.itemId);

        //arr.splice(2, 0, "Lene");

        const header = event.currentTarget;
        // Get the type of item to create.
        const type = header.dataset.type;
        // Grab any data associated with this control.
        const data = duplicate(header.dataset);
        data.traditionid = li.dataset.itemId;
        // Initialize a default name.
        const name = `New ${type.capitalize()}`;
        // Prepare the item object.
        const itemData = {
            name: name,
            type: type,
            data: data
        };

        // Remove the type from the dataset since it's in the itemData.type prop.
        delete itemData.data["type"];

        return this.actor.createOwnedItem(itemData);
    }

    deleteItem(item) {
        this.actor.deleteOwnedItem(item.data("itemId"));
        item.slideUp(200, () => this.render(false));
    }

    /**
     * Handle clickable rolls.
     * @param {Event} event   The originating click event
     * @private
     */
    _onRoll(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const dataset = element.dataset;

        if (dataset.roll) {
            let roll = new Roll(dataset.roll, this.actor.data.data);
            let label = dataset.label ? `Rolling ${dataset.label}` : '';
            roll.roll().toMessage({
                speaker: ChatMessage.getSpeaker({
                    actor: this.actor
                }),
                flavor: label
            });
        }
    }

    rollAttribute(attribute, boonesbanes) {
        let attribueName = attribute.label.charAt(0).toUpperCase() + attribute.label.toLowerCase().slice(1);

        // Roll
        let diceformular = "1d20+" + attribute.modifier;

        if (boonesbanes != 0) {
            diceformular = diceformular + "+" + boonesbanes + "d6kh";
        }
        let r = new Roll(diceformular, {});
        r.roll();


        var templateData = {
            actor: this.actor,
            item: {
                name: attribueName.toUpperCase()
            },
            data: {
                diceTotal: {
                    value: r._total
                },
                diceResult: {
                    value: r.result.toString()
                },
                resultText: {
                    value: (r._total >= 10 ? "SUCCESS" : "FAILURE")
                }
            }
        };

        let template = 'systems/demonlord/templates/chat/challenge.html';
        renderTemplate(template, templateData).then(content => {
            ChatMessage.create({
                user: game.user._id,
                speaker: ChatMessage.getSpeaker({
                    actor: this.actor
                }),
                content: content
            });
        });
    }

    rollAttack(weapon, boonsbanes) {
        let weaponName = weapon.name;
        let diceformular = "1d20";

        // Add Attribute modifer to roll
        let attackAttribute = weapon.data.data.action.attack;
        const attribute = this.actor.data.data.attributes[attackAttribute.toLowerCase()];

        // Roll for Attack
        if (attackAttribute) {
            diceformular = diceformular + "+" + attribute.modifier;
        }

        // Add weapon boonsbanes
        if (weapon.data.data.action.boonsbanes != 0) {
            boonsbanes = parseInt(boonsbanes) + parseInt(weapon.data.data.action.boonsbanes);
        }

        if (boonsbanes != 0) {
            diceformular = diceformular + "+" + boonsbanes + "d6kh";
        }
        let attackRoll = new Roll(diceformular, {});
        attackRoll.roll();

        // Roll Against Target
        const targetNumber = this.getTargetNumber(weapon);

        //Plus20 roll
        let plus20 = (attackRoll._total >= 20 ? true : false);

        // Roll Damage
        let damageformular = weapon.data.data.action.damage;
        let damageRoll = new Roll(damageformular, {});
        damageRoll.roll();

        var templateData = {
            actor: this.actor,
            item: {
                name: weaponName
            },
            data: {
                diceTotal: {
                    value: attackRoll._total
                },
                diceResult: {
                    value: attackRoll.result.toString()
                },
                resultText: {
                    value: (attackRoll._total >= targetNumber ? "SUCCESS" : "FAILURE")
                },
                attack: {
                    value: attackAttribute.toUpperCase()
                },
                against: {
                    value: weapon.data.data.action.against.toUpperCase()
                },
                againstNumber: {
                    value: targetNumber
                },
                damage: {
                    value: damageRoll._total
                },
                plus20: {
                    value: plus20
                },
                plus20text: {
                    value: weapon.data.data.action.plus20
                },
                description: {
                    value: weapon.data.data.description
                },
                tagetname: {
                    value: this.getTargetName()
                }
            }
        };

        let template = 'systems/demonlord/templates/chat/combat.html';
        renderTemplate(template, templateData).then(content => {
            ChatMessage.create({
                user: game.user._id,
                speaker: ChatMessage.getSpeaker({
                    actor: this.actor
                }),
                content: content
            });
        });
    }

    rollTalent(talent, boonsbanes) {
        let talentName = talent.name;
        let diceformular = "1d20";
        let roll = false;

        // Add Attribute modifer to roll
        let attackAttribute = talent.data.data.action.attack;
        const attribute = this.actor.data.data.attributes[attackAttribute.toLowerCase()];

        // Roll for Attack
        if (attackAttribute) {
            diceformular = diceformular + "+" + attribute.modifier;
            roll = true;
        }

        // Add weapon boonsbanes
        if (talent.data.data.action.boonsbanes != 0) {
            boonsbanes = parseInt(boonsbanes) + parseInt(talent.data.data.action.boonsbanes);
        }

        if (boonsbanes != 0) {
            diceformular = diceformular + "+" + boonsbanes + "d6kh";
        }
        let attackRoll = new Roll(diceformular, {});
        attackRoll.roll();

        // Roll Against Target
        const targetNumber = this.getTargetNumber(talent);

        //Plus20 roll
        let plus20 = (attackRoll._total >= 20 ? true : false);

        // Roll Damage
        let damageformular = talent.data.data.action.damage;
        let damageRoll = new Roll(damageformular, {});
        damageRoll.roll();

        var templateData = {
            actor: this.actor,
            item: {
                name: talentName
            },
            data: {
                roll: {
                    value: roll
                },
                diceTotal: {
                    value: attackRoll._total
                },
                diceResult: {
                    value: attackRoll.result.toString()
                },
                resultText: {
                    value: (attackRoll._total >= targetNumber ? "SUCCESS" : "FAILURE")
                },
                attack: {
                    value: attackAttribute.toUpperCase()
                },
                against: {
                    value: talent.data.data.action.against.toUpperCase()
                },
                againstNumber: {
                    value: targetNumber
                },
                damage: {
                    value: damageRoll._total
                },
                plus20: {
                    value: plus20
                },
                plus20text: {
                    value: talent.data.data.action.plus20
                },
                description: {
                    value: talent.data.data.description
                },
                tagetname: {
                    value: this.getTargetName()
                }
            }
        };

        let template = 'systems/demonlord/templates/chat/talent.html';
        renderTemplate(template, templateData).then(content => {
            ChatMessage.create({
                user: game.user._id,
                speaker: ChatMessage.getSpeaker({
                    actor: this.actor
                }),
                content: content
            });
        });
    }

    rollSpell(spell, boonsbanes) {
        let spellName = spell.name;
        let diceformular = "1d20";

        // Add Attribute modifer to roll
        let attackAttribute = spell.data.data.action.attack;
        const attribute = this.actor.data.data.attributes[attackAttribute.toLowerCase()];

        // Roll for Attack
        if (attackAttribute) {
            diceformular = diceformular + "+" + attribute.modifier;
        }

        // Add weapon boonsbanes
        if (spell.data.data.action.boonsbanes != 0) {
            boonsbanes = parseInt(boonsbanes) + parseInt(spell.data.data.action.boonsbanes);
        }

        if (boonsbanes != 0) {
            diceformular = diceformular + "+" + boonsbanes + "d6kh";
        }
        let attackRoll = new Roll(diceformular, {});
        attackRoll.roll();

        // Roll Against Target
        const targetNumber = this.getTargetNumber(spell);

        //Plus20 roll
        let plus20 = (attackRoll._total >= 20 ? true : false);

        // Roll Damage
        let damageformular = spell.data.data.action.damage;
        let damageRoll = new Roll(damageformular, {});
        damageRoll.roll();

        var templateData = {
            actor: this.actor,
            item: {
                name: spellName
            },
            data: {
                diceTotal: {
                    value: attackRoll._total
                },
                diceResult: {
                    value: attackRoll.result.toString()
                },
                resultText: {
                    value: (attackRoll._total >= targetNumber ? "SUCCESS" : "FAILURE")
                },
                attack: {
                    value: attackAttribute.toUpperCase()
                },
                against: {
                    value: spell.data.data.action.against.toUpperCase()
                },
                againstNumber: {
                    value: targetNumber
                },
                damage: {
                    value: damageRoll._total
                },
                attribute: {
                    value: spell.data.data.attribute
                },
                plus20: {
                    value: plus20
                },
                plus20text: {
                    value: spell.data.data.action.plus20
                },
                description: {
                    value: spell.data.data.description
                },
                spellcastings: {
                    value: spell.data.data.castings.max
                },
                spellduration: {
                    value: spell.data.data.duration
                },
                spelltarget: {
                    value: spell.data.data.target
                },
                spellarea: {
                    value: spell.data.data.area
                },
                spellrequirements: {
                    value: spell.data.data.requirements
                },
                spellsacrifice: {
                    value: spell.data.data.sacrifice
                },
                spellpermanence: {
                    value: spell.data.data.permanence
                },
                spellspecial: {
                    value: spell.data.data.special
                },
                spelltriggered: {
                    value: spell.data.data.triggered
                },
                tagetname: {
                    value: this.getTargetName()
                }
            }
        };

        let template = 'systems/demonlord/templates/chat/spell.html';
        renderTemplate(template, templateData).then(content => {
            ChatMessage.create({
                user: game.user._id,
                speaker: ChatMessage.getSpeaker({
                    actor: this.actor
                }),
                content: content
            });
        });
    }

    showDeleteDialog(title, content, item) {
        let d = new Dialog({
            title: title,
            content: content,
            buttons: {
                yes: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize('DL.DialogYes'),
                    callback: (html) => this.deleteItem(item)
                },
                no: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize('DL.DialogNo'),
                    callback: () => {}
                }
            },
            default: "no",
            close: () => {}
        });
        d.render(true);
    }

    getTargetNumber(weapon) {
        let tagetNumber;

        game.user.targets.forEach(async target => {
            const targetActor = target.actor;
            let againstSelectedAttribute = weapon.data.data.action.against.toLowerCase();

            if (againstSelectedAttribute == "defense") {
                tagetNumber = targetActor.data.data.characteristics.defense;
            } else {
                tagetNumber = targetActor.data.data.attributes[againstSelectedAttribute].value;
            }
        });

        return tagetNumber;
    }

    getTargetName() {
        let tagetName;

        game.user.targets.forEach(async target => {
            tagetName = target.name;
        });

        return tagetName;
    }
}