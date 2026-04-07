const STARTER_DICTIONARY = `
able about above ache acid acorn acre act actor acute adore after again agent
agree air aisle alarm album alert alike alive allow almost alone along alpha
also alter amber among angel anger angle apple april arch area argue arise
arm around arrow art ash aside atom attic audio august aunt author award
aware away axis bacon bake baker balance ball banana band bank barn base
basic basil bath battle beach beam bean bear beard beast beat become bed
bee before begin being below bench berry best between beyond bike bird birth
bison black blade blank blast blend bless blind block bloom blue board boast
boat body boil bold bolt bond bone book boost border born both bottle
bottom bounce bowl box brain brake brand brave bread break breeze brick bridge
brief bring brisk broad broil brother brown brush bubble budget build built burst
bush busy butter button cabin cable cactus cafe cage cake calm camel camera
camp canal candy canvas cape captain car carbon card care cargo carpet carry
case cash castle cat catch cause cave cease cedar cell cent chain chair
chalk chance change chaos charge chart chase cheap check cheek cheer chess chest
chief child chime choice chorus circle city claim clap class clean clear clerk
cliff climb clock close cloth cloud coach coast coat code coin cold color
column come comet comic common cone confirm cook cool copper copy coral cord
core corn corner correct cost cotton couch count court cove cover craft crane
crash crate crawl crazy cream create creek crest crew crisp cross crowd crown
crystal cube culture cure curl current curve custom cycle daily daisy dance danger
dare dark data date dawn day dear decide deck deep deer delay delta
dent desert design desk detail device diary dice digit dine dinner dirt direct
dish disk ditch dive doctor dog doing dollar domain done door dose double
dove draft dragon drama draw dream dress drift drink drive drop drum duck
duet dune during dust duty each eager eagle early earth ease east easy
echo edge edit effect effort eight elder elect elite else ember empty end
energy engine enjoy enter entry equal equip era escape essay estate ethic even
event every exact exit extra fabric face fact fade faint fair faith fall
false fame family fancy farm fashion fast favor feast feature fence fever fiber
field fierce fight file fill film final find fine finish fire firm first
fish five flag flame flash flavor flea fleet flesh flight flock floor flora
flour flow flower fluid flush focus fog foil fold follow food foot forage
force forest forge form formal fort forum found frame fresh friend fringe front
frost fruit fuel future gain gallery game garden garlic gather gaze gear geese
gem general gentle giant gift ginger glad glance glass glide globe glory glove
glow goal goat gold good grace grade grain grant grape graph grass great
green greet grief grin ground group grow guard guess guest guide guitar habit
hair half hall hammer hand happy harbor hard harmony harvest hazel head health
heart heat heavy hedge height hello helmet herb hero hidden high hike hill
hobby hold holiday home honey honor hook hope horizon horse host hotel hour
house hover human humor hunter hurry icon idea image imagine impact inch index
indoor infant input inside island issue ivory jacket jade jazz jelly jewel join
joke judge juice july jump jungle junior kale keen keep kettle key kind
king kit kite knee knife knit knock knot label labor lace ladder lady
lake lamp land lane large laser late laugh launch layer leader leaf learn
leave legal legend lemon lens level library light lilac limit line linen lion
liquid listen little load local logic long look loose lotus loud lounge love
loyal luck lunar lunch machine magic magnet major make maker map marble march
market mask match matter meadow meal measure medal media melon memory menu mesh
metal meter middle might milk mind mineral mint mirror mission model modern moment
money monkey month moon moral more morning motion mount mouse movie music myth
name narrow nation native nature near neat neck need needle nerve nest never
next night noble noise normal north note novel nurse oasis object ocean octave
offer often olive omega once onion open orbit order organ origin other ounce
outer oven owner ozone pace pack page paint pair panel panic paper party
path patio pause peace peach pearl peer pencil pepper perfect permit petal phase
phone photo piano piece pilot pine pink pipe pizza place plain plan planet
plant plate play pleasant plot plume plus pocket poem point polar pond pool
popular port pose poster potato power praise press price pride prime print prism
prize problem profit proof proud prove public pulse pure quest quick quiet quilt
quite quote rabbit radar radio rain raise rally ranch range rapid rare rather
reach react read ready real reason record reef reflect region relax relay relief
remain remote renew rent repair repeat reply report rescue resin result return reveal
review rhythm rice rich ridge right ring rise risk river road roast robot
rock rocket room rose rough round route royal rule runner rural safe sail
salad salt same sand scale scene school science score scout screen script sea
search season seat second secret section seed seek seem select sense series serve
settle shadow shake shape share sharp shed sheet shelf shell shift shine ship
shirt shock shore short should shout show shower shrimp shrine side signal silver
simple since singer single sister site skill sky slate sleep slice slide slight
slip slope small smart smile smoke snack snake snow social soft solar solid
solve song sort sound soup source south space spare spark speak special speed
spell spice spider spin spirit spoon sport spot spring square stable stack stage
stair stamp stand staple star start state steam steel step stick still stone
storm story stove strand stream street strike string strong study style submit sudden
sugar summer sun sunset super supply sure surface swarm sweet swift swim swing
symbol table tackle tactic tail talent talk tank taste teach team temper temple
tempo tennis tent term test text thank theme there thick thing think third
thorn those thread thrive throw tide tiger time timber tiny tired toast today
token tone tongue tool topic torch total touch tower track trade trail train
treat tree trend trial tribe trick trim trio trip trophy trouble true trust
tulip tune tunnel turn turtle twelve uncle under union unique until update upper
urban usual vacuum valid valley value velvet vendor venue verse very vessel victory
video view village violin visit visual vital voice voyage wagon wait walk wall
walnut want warm water wave wealth weapon weave week welcome west whale wheat
wheel where while whisper white whole window wing winter wise wish within woman
wonder wood word work world woven write writer yard year yellow yonder young
zebra zero zinc zone zoo
`;

export const DICTIONARY_WORDS = STARTER_DICTIONARY.split(/\s+/)
  .map((word) => word.trim().toLowerCase())
  .filter(Boolean);

export const DICTIONARY_SET = new Set(DICTIONARY_WORDS);
