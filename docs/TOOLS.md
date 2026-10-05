# Camp tools

New runs include only a salvaged survival knife. A cooking pot, canteen, fire drill and all later tools must be crafted from gathered materials. Camp Gather can recover a finite five scrap from the wreck; scrap is deducted from that deposit only when it fits into the pack. Further metal comes from Forgotten Cabin. The guide prepares a working canteen and pot before the forest lesson and directs exhausted deposits toward the cabin. Every tool has generated art, pack weight, durability, a replacement recipe and material-specific repair costs. The seven tool illustrations are in `art/generated/items/`; individual prompts and generation metadata are preserved in `art/catalog.json`.

Compatible pre-v1.4 saves receive no automatic kit. In v1.4 saves, full-durability free tools are withdrawn only when their original identifiers or migration log and complete subsequent history prove they were unused. Used tools, crafted replacements, repaired equipment and gear with incomplete history remain. Crafting now records origin and use to support future migrations. The withdrawal runs once, preserves existing identifiers and clocks, and does not reset statistics or materials.

| Tool | Required use | Wear | Repair materials |
| --- | --- | --- | --- |
| Cooking pot | Boil river water; stew, tea, herbal medicine | 2 per preparation | 1 scrap |
| Roasting spit | Roast raw meat or fish | 2 per preparation | 1 wood, 1 fiber |
| Canteen | Collect river water | 1 per collection | 1 scrap, 1 fiber |
| Fire drill | Light a cold campfire | 1 per ignition | 1 wood, 1 fiber |
| Pickaxe | Mine copper; equipped torch also required in the cave | 4 per mining action | 2 stone, 1 fiber |
| Hammer | Advanced shelters, salvaged axe, battery and radio | 2 per craft | 1 stone, 1 fiber |
| Sewing kit | Hide jacket, alpine coat and backpack | 2 per craft | 1 hide, 2 fiber |

Carried kit works automatically without occupying the three equipment slots. The pickaxe can occupy the tool slot, but cave mining uses a carried pickaxe alongside an **equipped torch**. Firewood harvesting still benefits from an equipped axe; fishing requires an equipped fishing rod, hunting requires a weapon, and carcass processing requires a carried working knife or axe. An equipped torch wears by 3 during mining. Unrelated axes, cookware and fishing rods no longer lose durability during the wrong action.

Missing or broken required gear refuses an action before changing ingredients, time, statistics or RNG. Tool-status chips in the action/recipe dialog show **ready**, **needed** or **worn out**, with a Craft or Repair shortcut. Repairs at camp restore up to 40 durability and display the actual material cost. Replacement crafting includes a survival knife.

Cookware is reusable: ingredients are consumed and the existing utensil wears, rather than consuming the utensil as an ingredient. Rain can interrupt cooking; raw ingredients return, no cooked food appears, and the spent time, energy and utensil wear remain. Fueling an already burning fire does not require a fire drill. Shelter and a fire canopy retain separate weather effects.

The canteen costs one scrap and two fiber to craft, matching its metal construction and allowing water collection without an early hunt. Simulation tests cover prerequisites, refused-action atomicity, repeated boiling, weather interruption, mining wear, carried slots, repair materials, finite salvage, withdrawn gifts and preserved earned equipment. Public UI verification follows real Craft/Repair controls; a full Explorer campaign obtains the required tools through normal actions. See [verification](VERIFICATION.md) for the current evidence and limits.
