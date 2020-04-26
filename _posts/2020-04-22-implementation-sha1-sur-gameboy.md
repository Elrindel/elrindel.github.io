---
layout: post
title:  "Implémentation SHA1 sur GameBoy"
date:   2020-04-22 20:43:30
categories: gameboy
---

Suite à une petite discussion avec [entropyQueen](https://ark444.github.io/){:target="_blank"} concernant ses projets sur GameBoy, je me suis lancé dans l'implémentation de l'algorithme de hachage SHA1 sur GameBoy !

C'était une première pour moi puisque j'avais encore jamais fait de programmation sur GB (et très peu fait d'assembleur également). Dans cet article je vais donc vous partager mon apprentissage en essayant d'expliquer au mieux mes recherches/analyses/réflexions pour avancer sur ce projet !

Les sources de ce projet sont disponibles ici : [SHA1 GameBoy](https://github.com/Elrindel/SHA1-GameBoy){:target="_blank"}

## Programmation sur GameBoy

Ma première étape a été de me renseigner sur les différentes méthodes possibles de programmation sur GB.

Il m'est vite apparu que la seule solution réellement intéressante est l'assembleur !

On trouve d'ailleurs assez facilement un certain nombre d'articles qui traitent très bien ce sujet. Dans mon cas, je me suis arrêté sur l'article de [Furrtek](http://furrtek.free.fr/?a=gbasm){:target="_blank"} qui a le mérite d'être clair et assez complet pour débuter dans le domaine.

### Spécifications techniques de la GameBoy

Il existe plusieurs versions de la documentation mais globalement le contenu est toujours le même.  
Afin de m'assurer de ne pas perdre ce document (comme c'est le cas avec le lien fourni par Furrtek), j'ai préféré en faire une copie ici sur mon blog : [Spécifications GameBoy](specifications-gameboy){:target="_blank"}

Ce document donne toutes les indications nécessaires pour utiliser l'ensemble des fonctionnalités de la GB !

Je ne rentrerai pas dans les détails (sauf si besoin pour certains points spécifiques), des articles comme celui de Furrtek font déjà très bien le travail.

Pour ce projet j'ai utilisé l'émulateur BGB. J'avoue ne pas avoir testé les autres étant donné que celui-ci répondait parfaitement à mes besoins.

### Assembleur WLA DX

Comme le suggère Furrtek dans son article, je vais utiliser l'assembleur [WLA-DX](https://github.com/vhelin/wla-dx){:target="_blank"}.  
Suivez les instructions de compilations indiquées dans le [readme](https://github.com/vhelin/wla-dx/blob/master/README.md){:target="_blank"} ou [téléchargez une version déjà compilée](http://www.villehelin.com/wla.html){:target="_blank"}.

Pour simplifier l'utilisation, j'ai ajouté le dossier **binaries** à ma variable d'environnement **PATH**.

Voici un petit script que j'ai nommé ``wla-gb-build`` et qui permet de faciliter l'utilisation de **WLA-DX** (je l'ai ajouté dans le dossier **binaries**) :

```sh
#!/bin/sh

fileDir=$(dirname "$1")
fileName=$(basename -- "$1")
fileName="${fileName%.*}"

echo [objects]>"${fileDir}/linkfile"
echo ${fileDir}/${fileName}.o>>"${fileDir}/linkfile"

[ -e "${fileDir}/${fileName}.o" ] && rm "${fileDir}/${fileName}.o"

wla-gb -o "${fileDir}/${fileName}.o" $1
wlalink -d -r -v -s "${fileDir}/linkfile" "${fileDir}/${fileName}.gb"
```

Ainsi il suffit d'exécuter la commande ``wla-gb-build mon_jeu.s`` pour obtenir le fichier ``mon_jeu.gb``.


## Algorithme SHA1

Maintenant que je sais comment créer et tester des programmes GB, je peux m'attaquer à la plus grosse partie, l'algorithme SHA1 !

La solution qui me semble la plus évidente consiste à trouver le code de cet algorithme en C, ou même directement en assembleur x86, puis de voir comment je peux l'adapter avec les instructions disponibles en z80 (enfin, la version GB qui est légèrement différente d'un véritable z80).

J'ai donc trouvé mon bonheur sur ce site : [https://www.nayuki.io/page/fast-sha1-hash-implementation-in-x86-assembly](https://www.nayuki.io/page/fast-sha1-hash-implementation-in-x86-assembly){:target="_blank"}

Plus particulièrement leur implémentation en version **fast**.

### Opérations 32 bits sur CPU 8 bits

En étudiant un peu l'assembleur de la version **fast** je remarque, sans surprise, un certain nombre d'instructions basées sur une architecture 32 bits.

Les instructions en question sont les suivantes :

- ``movl`` Ecrit un entier 32 bits à une adresse en mémoire
- ``andl`` Opération logique **and** entre 2 entiers 32 bits
- ``orl``  Opération logique **or** entre 2 entiers 32 bits
- ``xorl`` Opération logique **xor** entre 2 entiers 32 bits
- ``addl`` Additionne 2 entiers 32 bits
- ``roll`` Rotation des bits vers la gauche sur un entier 32 bits (les bits qui sortent re-rentrent par la droite)

Concernant l'instruction ``bswapl`` (qui permet d'inverser l'ordre des 4 octets d'un entier 32 bits), elle n'est pas nécessaire en z80 (pour cet algorithme en tout cas), voir l'implémentation de ``addl`` ci-dessous pour plus de détails.

Désormais il faut trouver un moyen de convertir ces instructions 32 bits pour pouvoir les utiliser sur un CPU 8 bits !

Afin de simplifier l'utilisation, je choisis arbitrairement que le registre **BC** correspond à la source, et le registre **HL** à la destination.

#### Instruction ``movl``

Cette instruction est probablement la plus simple à réaliser puisqu'il s'agit de déplacer 4 octets d'une adresse vers une autre.

```nasm
movl:                   ;hl=bc
  ld e,4                ;e = 4
loopmovl:
  ld a,(bc)             ;a = (bc)
  ldi (hl),a            ;(hl) = a, hl += 1
  inc bc                ;bc += 1
  dec e                 ;e -= 1
  jr nz,loopmovl        ;Si e != 0 : Jump loopmovl
  ret
```

La valeur pointée par le registre **BC** est insérée dans le registre **A** qui est ensuite insérée à l'adresse pointée par le registre **HL**.  
Les adresses pointées par **HL** et **BC** sont incrémentées afin de passer à l'octet suivant. Ces opérations sont répétées 4 fois.

#### Instructions ``andl``, ``orl``, ``xorl``

Le principe est très similaire à ``movl``, il faut juste réaliser une opération supplémentaire (``and``, ``or``, ``xor``) sur chaque octet.

Exemple pour l'instruction ``and`` :

```nasm
andl:                   ;hl&=bc
  ld e,4                ;e = 4
loopandl:
  ld a,(bc)             ;a = (bc)
  and (hl)              ;a &= (hl)
  ldi (hl),a            ;(hl) = a, hl += 1
  inc bc                ;bc += 1
  dec e                 ;e -= 1
  jr nz,loopandl        ;Si e != 0 : Jump loopandl
  ret
```

#### Instruction ``addl``

Voilà enfin un peu de challenge !! Réaliser une addition de deux entiers 32 bits avec seulement des instructions sur 8 bits.  
A première vue il est légitime de penser que c'est compliqué, mais en réalité ça ne l'est pas !

L'instruction ``add`` permet d'additionner deux entiers 8 bits, et si 8 bits ne suffisent pas pour stocker le résultat, alors il y aura une retenue qu'on peut intercepter via le flag **c** (Carry Flag) !

On peut donc facilement étendre l'addition à plusieurs octets en utilisant le flag **c** pour vérifier si il est nécessaire d'appliquer la retenue sur l'octet suivant !

A ce niveau il faut être cohérent sur l'ordre des octets. Le résultat ne pourra pas être le même si on va de l'octet 1 à 4 (little endian) ou de l'octet 4 à 1 (big endian). Pour simplifier et éviter d'implémenter l'instruction ``bswapl`` j'ai décidé de partir sur l'ordre big endian.

```nasm
addl:                   ;hl+=bc
  inc bc                ;bc += 1
  inc bc                ;bc += 1
  inc bc                ;bc += 1
  inc hl                ;hl += 1
  inc hl                ;hl += 1
  inc hl                ;hl += 1
  ld d,5                ;d = 5
  jp addlstart          ;Jump addlstart
addlnext:
  pop de                ;UnStack de
  pop hl                ;UnStack hl
  dec hl                ;hl -= 1
addlstart:
  dec d                 ;d -= 1
  jr z,addlend          ;Si d == 0 : Jump addlend
  ld a,(bc)             ;a = (bc)
  dec bc                ;bc -= 1
  push hl               ;Stack hl
  push de               ;Stack de
  add (hl)              ;a += (hl)
  ld (hl),a             ;(hl) = a
  jr nc,addlnext        ;Si a+(hl) < 256 : Jump addlnext (si pas de retenue)
addlnc:
  dec d                 ;d -= 1
  jr z,addlnext         ;Si d == 0 : Jump addlnext (si on est sur le dernier octet)
  dec hl                ;hl -= 1
  inc (hl)              ;(hl) += 1 (on applique la retenue)
  jr nz,addlnext        ;Si (hl) != 0 : Jump addlnext
  jp addlnc             ;Sinon Jump addlnc (on fait suivre la retenue sur l'octet suivant)
addlend:
  ret
```

Pour commencer il faut ajouter 3 aux registres **HL** et **BC** afin de commencer le traitement sur les bons octets, puis je commence les additions octet par octet tout en appliquant bien la retenue aux octets suivants.

Je sauvegarde les registres **HL** et **DE** sur la pile (Stack) afin de pouvoir procéder aux éventuels applications de retenues sans pour autant perdre le compte (puisque je dois décrémenter **D** et **HL** pour gérer correctement les retenues) puis je rétablis **HL** et **DE** pour le traitement du prochain octet (**addlnext**).


#### Instruction ``roll``

On monte encore d'un cran en terme de challenge !! Je n'ai pas encore réussi à implémenter un ``roll`` générique et j'ai une doute sur la pertinence de le faire étant donné la complexité d'une telle opération comparé au besoin pour ce projet.

En analysant l'algorithme SHA1 on constate que ``roll`` est utilisé seulement avec 3 décalages différents (1, 5 et 30). J'ai donc décidé de créer ces 3 ``roll`` différents sans chercher à faire une version générique.  
Pour cela j'ai posé sur papier chacun des 3 décalages afin de voir les correspondances des bits entre chaque octet, et ainsi pouvoir le retranscrire en assembleur.

**Je suis cependant curieux/preneur de toutes solutions génériques ou de toutes optimisations de mon implémentation actuelle !**

Voici le ``roll5`` en exemple :

```nasm
roll5:                  ;hl=roll(bc,5)
  push hl               ;Stack hl
  pop de                ;UnStack de = hl

  push bc               ;Stack bc
  pop hl                ;UnStack hl = bc

  ld b,3                ;b = 3
looproll5:
  ldi a,(hl)            ;a = (hl), hl += 1
  sla a                 ;a <<= 1
  sla a                 ;a <<= 1
  sla a                 ;a <<= 1
  sla a                 ;a <<= 1
  sla a                 ;a <<= 1
  ld c,(hl)             ;c = (hl)
  srl c                 ;c >>= 1
  srl c                 ;c >>= 1
  srl c                 ;c >>= 1
  or c                  ;a |= c
  ld (de),a             ;(de) = a
  inc de                ;de += 1
  dec b                 ;b -= 1
  jr nz,looproll5       ;Si b != 0 : Jump looproll5

  ldd a,(hl)            ;a = (hl), hl -= 1
  dec hl                ;hl -= 1
  dec hl                ;hl -= 1
  sla a                 ;a <<= 1
  sla a                 ;a <<= 1
  sla a                 ;a <<= 1
  sla a                 ;a <<= 1
  sla a                 ;a <<= 1
  ld c,(hl)             ;c = (hl)
  srl c                 ;c >>= 1
  srl c                 ;c >>= 1
  srl c                 ;c >>= 1
  or c                  ;a |= c
  ld (de),a             ;(de) = a

  ret
```

Il s'agit donc de réaliser les bons ``shift`` (décalages) sur les bons octets puis de faire un ``or`` pour fusionner les bits.

Le principe est identique pour les 3 ``roll`` (1, 5 et 30) mais avec les bons décalages et les bonnes correspondances pour chacun.

### Espace mémoire nécessaire (variables)

Voici les différentes variables qui seront nécessaires au bon fonctionnement de l'algo :

```nasm
Step      DB            ;C000      : Compteur de rounds
StateA    DS 4          ;C001-C004 : SHA1 A en cours
StateB    DS 4          ;C005-C008 : SHA1 B en cours
StateC    DS 4          ;C009-C00C : SHA1 C en cours
StateD    DS 4          ;C00D-C010 : SHA1 D en cours
StateE    DS 4          ;C011-C014 : SHA1 E en cours
StateT    DS 4          ;C015-C018 : Temporaire pour les opérations sur les State
RollT     DS 4          ;C019-C01C : Temporaire pour certaines opérations 
RoundK    DS 4          ;C01D-C020 : SHA1 K du round en cours
Block     DS 64         ;C021-C060 : SHA1 Block (message à hacher)
Schedule  DS 64         ;C061-C0A0 : Temporaire pour les opérations sur Block
InitA     DS 4          ;C0A1-C0A5 : Sauvegarde SHA1 A à l'initialisation
InitB     DS 4          ;C0A6-C0A9 : Sauvegarde SHA1 B à l'initialisation
InitC     DS 4          ;C0AA-C0AD : Sauvegarde SHA1 C à l'initialisation
InitD     DS 4          ;C0AE-C0B1 : Sauvegarde SHA1 D à l'initialisation
InitE     DS 4          ;C0B2-C0B5 : Sauvegarde SHA1 E à l'initialisation
Reg1      DS 2          ;C0B6-C0B7 : Registre 1
Reg2      DS 2          ;C0B8-C0B9 : Registre 2
```

**Total :** 185 octets

Les variables ``StateA`` à ``StateE`` contiennent le hash SHA1 en cours de calcul, le hash final sera donc dans ces variables également.  
Le hash correspond donc aux 20 octets de l'adresse ``C001`` à l'adresse ``C014``.

``Reg1`` et ``Reg2`` permettent de combler le faible nombre de registres disponibles sur la GB (seulement 3 registres 16 bits), ils servent donc de stockage d'adresse 16 bits.  
Ils sont nécessaires pour gérer la rotation automatique des 5 variables ``State`` à chaque round (voir le chapitre suivant).  
Sans eux il est possible de faire cette rotation en utilisant directement la pile (stack) mais il serait alors obligatoire de désactiver les interruptions de la GameBoy afin d'éviter d'avoir une interruption au mauvais moment qui viendrait écraser certaines données sur la pile : [Voir la documentation sur les interruptions](specifications-gameboy#interrupts){:target="_blank"}

### Initialisation SHA1

L'initialisation SHA1 consiste simplement à définir les valeurs des 5 états (``StateA`` à ``StateE``), il s'agit du vecteur d'initialisation du SHA1 par défaut :

```nasm
sha1:
  ;Init StateA = 0x67452301
  ld a,$67
  ld (StateA),a
  ld a,$45
  ld (StateA+1),a
  ld a,$23
  ld (StateA+2),a
  ld a,$01
  ld (StateA+3),a

  ;Init StateB = 0xEFCDAB89
  ld a,$EF
  ld (StateB),a
  ld a,$CD
  ld (StateB+1),a
  ld a,$AB
  ld (StateB+2),a
  ld a,$89
  ld (StateB+3),a

  ;Init StateC = 0x98BADCFE
  ld a,$98
  ld (StateC),a
  ld a,$BA
  ld (StateC+1),a
  ld a,$DC
  ld (StateC+2),a
  ld a,$FE
  ld (StateC+3),a

  ;Init StateD = 0x10325476
  ld a,$10
  ld (StateD),a
  ld a,$32
  ld (StateD+1),a
  ld a,$54
  ld (StateD+2),a
  ld a,$76
  ld (StateD+3),a

  ;Init StateE = 0xC3D2E1F0
  ld a,$C3
  ld (StateE),a
  ld a,$D2
  ld (StateE+1),a
  ld a,$E1
  ld (StateE+2),a
  ld a,$F0
  ld (StateE+3),a

sha1next:
  xor a                 ;a = 0
  ld (Step),a           ;(Step) = 0

  ld bc,StateA
  ld hl,InitA
  call movl             ;InitA = StateA

  ld bc,StateB
  ld hl,InitB
  call movl             ;InitB = StateB

  ld bc,StateC
  ld hl,InitC
  call movl             ;InitC = StateC

  ld bc,StateD
  ld hl,InitD
  call movl             ;InitD = StateD

  ld bc,StateE
  ld hl,InitE
  call movl             ;InitE = StateE
```

Cet algorithme procède au calcul du hash SHA1 par blocs de **64 octets** (voir le chapitre sur la construction de la chaine à hacher pour plus d'informations).

Il peut évidemment arriver qu'on ait besoin d'obtenir le hash de chaines bien plus longues que **64 octets**, c'est pourquoi il y a un second point de départ qui permet de ne pas réinitialiser les états du SHA1 en cours, il s'agit de ``sha1next``.

### Initialisation d'un round

A chaque round on constate deux changements, à savoir l'incrémentation du compteur de rounds (``Step``) ainsi qu'une rotation des arguments.  
Pour le round **0**, les arguments sont dans l'ordre ``A, B, C, D, E``, puis au round suivant on constate une rotation : ``E, A, B, C, D``, puis ``D, E, A, B, C`` et ainsi de suite pour les 80 rounds.

Je commence donc par initialiser le tout premier ordre :

```nasm
  ld hl,StateE
  push hl               ;Stack : StateE => ArgE
  ld hl,StateD
  push hl               ;Stack : StateD => ArgD
  ld hl,StateC
  push hl               ;Stack : StateC => ArgC
  ld hl,StateB
  push hl               ;Stack : StateB => ArgB
  ld hl,StateA
  push hl               ;Stack : StateA => ArgA
  jp initRound0         ;Jump initRound0
```

J'utilise la pile afin de manipuler plus facilement ces valeurs. Le dernier entré est le premier sorti, c'est pour cela que je ``push`` de ``StateE`` à ``StateA`` et non l'inverse.  
Vu qu'il s'agit de l'ordre pour le round **0** je jump directement à cette étape (voir le chapitre sur le round 0 ci-dessous).

Ensuite Il faut donc gérer la rotation des arguments pour les prochains rounds :

```nasm
loopRound:
  ;SP = 0
  ld hl,Reg1            ;hl = Reg1
  pop de                ;de = sp[0] = ArgA, sp = 2
  ld a,d                ;a = d
  ldi (hl),a            ;(hl) = a, hl += 1
  ld a,e                ;a = e
  ldi (hl),a            ;(hl) = a, hl += 1
  pop de                ;de = sp[2] = ArgB, sp = 4
  ld a,d                ;a = d
  ldi (hl),a            ;(hl) = a, hl += 1
  ld a,e                ;a = e
  ldi (hl),a            ;(hl) = a, hl += 1
  pop de                ;de = sp[4] = ArgC, sp = 6
  pop hl                ;hl = sp[6] = ArgD, sp = 8
  pop bc                ;bc = sp[8] = ArgE, sp = 10
  push hl               ;sp = 8, sp[8] = hl = D
  push de               ;sp = 6, sp[6] = de = C
  ld hl,Reg2            ;hl = Reg2
  ld d,(hl)             ;d = (hl)
  inc hl                ;hl += 1
  ld e,(hl)             ;e = (hl)
  push de               ;sp = 4, sp[4] = de = Reg2 = ArgB
  ld hl,Reg1            ;hl = Reg1
  ld d,(hl)             ;d = (hl)
  inc hl                ;hl += 1
  ld e,(hl)             ;e = (hl)
  push de               ;sp = 2, sp[2] = de = Reg1 = ArgA
  push bc               ;sp = 0, sp[0] = bc = ArgE

  ld a,(Step)           ;a = (Step)
  inc a                 ;a += 1
  ld (Step),a           ;(Step) = a

  cp a,16
  jr c,loopRound0a      ;Si Step < 16: Jump loopRound0a
  cp a,20
  jr c,loopRound0b      ;Si Step < 20: Jump loopRound0b
  jr z,initRound1       ;Si Step == 20: Jump initRound1
  cp a,40
  jr c,loopRound1       ;Si Step < 40: Jump loopRound1
  jr z,initRound2       ;Si Step == 40: Jump initRound2
  cp a,60
  jr c,loopRound2       ;Si Step < 60: Jump loopRound2
  jr z,initRound3       ;Si Step == 60: Jump initRound3
  cp a,80
  jr c,loopRound3       ;Si Step < 80: Jump loopRound3
  jp loopRoundEnd       ;Sinon Jump loopRoundEnd
```

Afin de simplifier les commentaires je pars du principe que ``SP`` vaut 0, ce n'est évidemment pas le cas en réalité !

A ce niveau j'ai plusieurs possibilités pour faire la rotation.  
Dans un premier temps j'avais réalisé cela à base de ``pop`` et de ``push`` tout en jouant avec ``SP`` pour atteindre le bon emplacement. Mais cette solution n'était pas correcte car incompatible avec les interruptions GB !  
En effet, lors d'une interruption, la GameBoy va mettre en "pause" le code en cours d'exécution et faire l'équivalent d'un ``call`` vers le code de l'interruption (avec une étape en plus cependant). Cela a pour effet d'ajouter 2 adresses de retour sur la pile (pour les ``ret`` en fin d'interruption).  
De ce fait, si je tente de faire une rotation en me déplaçant directement dans la pile et qu'une interruption intervient en même temps, alors je verrai mes valeurs écrasées par ces adresses de retour.

Pour éviter cela, j'ai ajouté deux variables (``Reg1`` et ``Reg2``) qui me servent de registre tampon en complément des 3 registres 16 bits de la GB. Ainsi je peux totalement vider la pile des 5 arguments puis la reconstruire proprement sans risquer de perdre des valeurs !

Ensuite j'incrémente ``Step`` et je fais des simples comparaisons pour savoir quel round lancer.

### Round 0a et roundtail

Initialisation du round **0** :

```nasm
initRound0:
  ;Init RoundK ROUND0 0x5A827999
  ld hl,RoundK          ;hl = RoundK
  ld a,$5A              ;a = 0x5A
  ldi (hl),a            ;(hl) = a, hl += 1
  ld a,$82              ;a = 0x82
  ldi (hl),a            ;(hl) = a, hl += 1
  ld a,$79              ;a = 0x79
  ldi (hl),a            ;(hl) = a, hl += 1
  ld a,$99              ;a = 0x99
  ldi (hl),a            ;(hl) = a, hl += 1
loopRound0a:
  call round0a
  jp loopRound
loopRound0b:
  call round0b
  jp loopRound
```

On définit ``RoundK`` lors de l'initialisation du round **0** puis on appel ``round0a`` :

```nasm
round0a:
  ld a,(Step)           ;a = (Step)
  sla a                 ;a *= 2
  sla a                 ;a *= 2
  ld b,0                ;b = 0
  ld c,a                ;c = a
  ld hl,Block           ;hl = Block
  add hl,bc             ;hl += bc : Block[Step * 4]
  push hl               ;Stack hl
  ld hl,Schedule        ;hl = Schedule
  add hl,bc             ;hl += bc : Schedule[Step * 4]
  pop bc                ;UnStack bc = Block[Step * 4]
  push hl               ;Stack hl
  call movl             ;Schedule[Step * 4] = Block[Step * 4]

  pop bc                ;UnStack bc = Schedule[Step * 4]
  ld hl,sp+10           ;hl = Stack+10 = ArgE
  ld e,(hl)             ;e = (hl)
  inc hl                ;hl += 1
  ld d,(hl)             ;d = (hl)
  push de               ;Stack de
  pop hl                ;UnStack hl = de
  call addl             ;ArgE += Schedule[Step * 4]

  jp round0
```

Il n'y a pas d'instruction pour réaliser directement une multiplication sur GB, cependant, un ``shift left`` revient à multiplier par deux, je le fais donc deux fois afin de multiplier par 4.

Pour atteindre ``ArgE`` j'utilise le registre ``SP`` sachant que j'ai construit la pile juste avant, je peux donc récupérer l'argument souhaité. Voici d'ailleurs à quoi ressemble la pile à ce moment :

- ``SP+0`` = Adresse de retour
- ``SP+2`` = ArgA
- ``SP+4`` = ArgB
- ``SP+6`` = ArgC
- ``SP+8`` = ArgD
- ``SP+10`` = ArgE

``round0`` correspond à la partie commune entre ``round0a`` et ``round0b`` :

```nasm
round0:
  ld hl,sp+6            ;hl = Stack+6 = ArgC
  ld c,(hl)             ;c = (hl)
  inc hl                ;hl += 1
  ld b,(hl)             ;b = (hl)
  ld hl,StateT          ;hl = StateT
  call movl             ;StateT = ArgC

  ld hl,sp+8            ;hl = Stack+8 = ArgD
  ld c,(hl)             ;c = (hl)
  inc hl                ;hl += 1
  ld b,(hl)             ;b = (hl)
  ld hl,StateT          ;hl = StateT
  call xorl             ;StateT ^= ArgD

  ld hl,sp+4            ;hl = Stack+4 = ArgB
  ld c,(hl)             ;c = (hl)
  inc hl                ;hl += 1
  ld b,(hl)             ;b = (hl)
  ld hl,StateT          ;hl = StateT
  call andl             ;StateT &= ArgB

  ld hl,sp+8            ;hl = Stack+6 = ArgD
  ld c,(hl)             ;c = (hl)
  inc hl                ;hl += 1
  ld b,(hl)             ;b = (hl)
  ld hl,StateT          ;hl = StateT
  call xorl             ;StateT ^= ArgD

  jp roundtail
```

``round0`` étant atteint via un ``jump``, il n'y a pas d'adresse de retour en plus sur la pile, ça ne change donc pas les accès aux arguments.  
``StateT`` est utilisé comme variable temporaire pour réaliser les calculs tout au long du round.

Je fais un ``jump`` et non un ``call`` pour atteindre ``roundtail`` car il est toujours appelé en fin de round, autant se servir du ``ret`` de ``roundtail`` et ainsi ne pas décaler la pile avec un autre ``call`` (les arguments restent donc accessibles avec la même offset sur SP).

```nasm
roundtail:
  ld hl,sp+4            ;hl = Stack+4 = ArgB
  ld c,(hl)             ;c = (hl)
  inc hl                ;hl += 1
  ld b,(hl)             ;b = (hl)
  push bc               ;Stack bc
  ld hl,RollT           ;hl = RollT
  call movl             ;RollT = ArgB
  pop hl                ;UnStack hl = ArgB
  ld bc,RollT           ;bc = RollT
  call roll30           ;ArgB = roll30(RollT)

  ld hl,sp+10           ;hl = Stack+10 = ArgE
  ld c,(hl)             ;c = (hl)
  inc hl                ;hl += 1
  ld b,(hl)             ;b = ArgE
  push bc               ;Stack bc
  push bc               ;Stack bc
  pop hl                ;UnStack hl = bc
  ld bc,StateT          ;bc = StateT
  call addl             ;ArgE += StateT

  pop hl                ;UnStack hl = ArgE
  ld bc,RoundK          ;bc = RoundK
  call addl             ;ArgE += RoundK

  ld hl,sp+2            ;hl = Stack+2 = ArgA
  ld c,(hl)             ;c = (hl)
  inc hl                ;hl += 1
  ld b,(hl)             ;b = (hl)
  ld hl,RollT           ;hl = RollT
  call roll5            ;RollT = roll5(ArgA)

  ld hl,sp+10           ;hl = Stack+10 = ArgE
  ld c,(hl)             ;c = (hl)
  inc hl                ;hl += 1
  ld b,(hl)             ;b = (hl)
  push bc               ;Stack bc
  pop hl                ;UnStack hl = bc
  ld bc,RollT           ;bc = RollT
  call addl             ;ArgE += RollT
  
  ret
```

``RollT`` est utilisé comme variable temporaire pour réaliser les opérations ``roll``.

### Round 0b et roundschedule

Les rounds **0a** et **0b** sont assez similaires et partagent la même valeur de **K**, ils ont donc la même initialisation ainsi qu'une partie de code en commun (voir ci-dessus pour l'initialisation du round).

Code ``round0b`` :

```nasm
round0b:
  call roundschedule
  jp round0
```

On a déjà vu ``round0`` ci-dessus puisqu'il s'agit du même code que pour ``round0a``.

Concernant ``roundschedule``, il sera utile pour tous les rounds excepté ``round0a`` :

```nasm
roundschedule:
  ld a,(Step)           ;a = (Step)
  sub 3                 ;a -= 3
  and 15                ;a &= 15
  sla a                 ;a *= 2
  sla a                 ;a *= 2
  ld b,0                ;b = 0
  ld c,a                ;c = a
  ld hl,Schedule        ;hl = Schedule
  add hl,bc             ;hl += bc : Schedule[(Step - 3) * 4]
  push hl               ;Stack hl
  pop bc                ;UnStack bc = hl
  ld hl,StateT          ;hl = StateT
  call movl             ;StateT = Schedule[(Step - 3) * 4]

  ld a,(Step)           ;a = (Step)
  sub 8                 ;a -= 8
  and 15                ;a &= 15
  sla a                 ;a *= 2
  sla a                 ;a *= 2
  ld b,0                ;b = 0
  ld c,a                ;c = a
  ld hl,Schedule        ;hl = Schedule
  add hl,bc             ;hl += bc : Schedule[(Step - 8) * 4]
  push hl               ;Stack hl
  pop bc                ;UnStack bc = hl
  ld hl,StateT          ;hl = StateT
  call xorl             ;StateT ^= Schedule[(Step - 8) * 4]

  ld a,(Step)           ;a = (Step)
  sub 14                ;a -= 14
  and 15                ;a &= 15
  sla a                 ;a *= 2
  sla a                 ;a *= 2
  ld b,0                ;b = 0
  ld c,a                ;c = a
  ld hl,Schedule        ;hl = Schedule
  add hl,bc             ;hl += bc : Schedule[(Step - 14) * 4]
  push hl               ;Stack hl
  pop bc                ;UnStack bc = hl
  ld hl,StateT          ;hl = StateT
  call xorl             ;StateT ^= Schedule[(Step - 14) * 4]

  ld a,(Step)           ;a = (Step)
  sub 16                ;a -= 16
  and 15                ;a &= 15
  sla a                 ;a *= 2
  sla a                 ;a *= 2
  ld b,0                ;b = 0
  ld c,a                ;c = a
  ld hl,Schedule        ;hl = Schedule
  add hl,bc             ;hl += bc : Schedule[(Step - 16) * 4]
  push hl               ;Stack hl
  pop bc                ;UnStack bc = hl
  ld hl,StateT          ;hl = StateT
  call xorl             ;StateT ^= Schedule[(Step - 16) * 4]

  ld bc,StateT          ;bc = StateT
  ld hl,RollT           ;hl = RollT
  call movl             ;RollT = StateT
  ld bc,RollT           ;bc = RollT
  ld hl,StateT          ;hl = StateT
  call roll1            ;StateT = roll1(RollT)

  ld hl,sp+12           ;hl = Stack+12 = ArgE
  ld c,(hl)             ;c = (hl)
  inc hl                ;hl += 1
  ld b,(hl)             ;b = (hl)
  push bc               ;Stack bc
  pop hl                ;UnStack hl = bc
  ld bc,StateT          ;bc = StateT
  call addl             ;ArgE += StateT

  ld a,(Step)           ;a = (Step)
  and 15                ;a &= 15
  sla a                 ;a *= 2
  sla a                 ;a *= 2
  ld b,0                ;b = 0
  ld c,a                ;c = a
  ld hl,Schedule        ;hl = Schedule
  add hl,bc             ;hl += bc : Schedule[Step * 4]
  ld bc,StateT          ;bc = StateT
  call movl             ;Schedule[Step * 4] = StateT

  ret
```

Rien de particulier à dire, le principe est similaire au reste du code qu'on a déjà vu plus haut.

### Round 1 et 3

J'ai regroupé les rounds **1** et **3** dans le même chapitre car la seule différence entre les deux c'est la valeur de **K** (donc l'initialisation).

Initialisation du round **1** :

```nasm
initRound1:
  ;Init RoundK ROUND1 0x6ED9EBA1
  ld hl,RoundK          ;hl = RoundK
  ld a,$6E              ;a = 0x6E
  ldi (hl),a            ;(hl) = a, hl += 1
  ld a,$D9              ;a = 0xD9
  ldi (hl),a            ;(hl) = a, hl += 1
  ld a,$EB              ;a = 0xEB
  ldi (hl),a            ;(hl) = a, hl += 1
  ld a,$A1              ;a = 0xA1
  ldi (hl),a            ;(hl) = a, hl += 1
loopRound1:
  call round1
  jp loopRound
```

Initialisation du round **3** :

```nasm
initRound3:
  ;Init RoundK ROUND3 0xCA62C1D6
  ld hl,RoundK          ;hl = RoundK
  ld a,$CA              ;a = 0xCA
  ldi (hl),a            ;(hl) = a, hl += 1
  ld a,$62              ;a = 0x62
  ldi (hl),a            ;(hl) = a, hl += 1
  ld a,$C1              ;a = 0xC1
  ldi (hl),a            ;(hl) = a, hl += 1
  ld a,$D6              ;a = 0xD6
  ldi (hl),a            ;(hl) = a, hl += 1
loopRound3:
  call round3
  jp loopRound
```

Code ``round1`` et ``round3`` :

```nasm
round1:
round3:
  call roundschedule

  ld hl,sp+4            ;hl = Stack+4 = ArgB
  ld c,(hl)             ;c = (hl)
  inc hl                ;hl += 1
  ld b,(hl)             ;b = (hl)
  ld hl,StateT          ;hl = StateT
  call movl             ;StateT = ArgB

  ld hl,sp+6            ;hl = Stack+6 = ArgC
  ld c,(hl)             ;c = (hl)
  inc hl                ;hl += 1
  ld b,(hl)             ;b = (hl)
  ld hl,StateT          ;hl = StateT
  call xorl             ;StateT ^= ArgC

  ld hl,sp+8            ;hl = Stack+8 = ArgD
  ld c,(hl)             ;c = (hl)
  inc hl                ;hl += 1
  ld b,(hl)             ;b = (hl)
  ld hl,StateT          ;hl = StateT
  call xorl             ;StateT ^= ArgD

  jp roundtail
```

### Round 2

Et pour terminer, le round **2** :

```nasm
round2:
  call roundschedule

  ld hl,sp+6            ;hl = Stack+6 = ArgC
  ld c,(hl)             ;c = (hl)
  inc hl                ;hl += 1
  ld b,(hl)             ;b = (hl)
  ld hl,StateT          ;hl = StateT
  call movl             ;StateT = ArgC

  ld bc,StateT          ;bc = StateT
  ld hl,RollT           ;hl = RollT
  call movl             ;RollT = StateT

  ld hl,sp+8            ;hl = Stack+8 = ArgD
  ld c,(hl)             ;c = (hl)
  inc hl                ;hl += 1
  ld b,(hl)             ;b = (hl)
  push bc               ;Stack bc : ArgD
  ld hl,StateT          ;hl = StateT
  call orl              ;StateT |= ArgD

  pop bc                ;UnStack bc = ArgD
  ld hl,RollT           ;hl = RollT
  call andl             ;RollT &= ArgD

  ld hl,sp+4            ;hl = Stack+4 = ArgB
  ld c,(hl)             ;c = (hl)
  inc hl                ;hl += 1
  ld b,(hl)             ;b = (hl)
  ld hl,StateT          ;hl = StateT
  call andl             ;StateT &= ArgB
  
  ld bc,RollT           ;bc = RollT
  ld hl,StateT          ;hl = StateT
  call orl              ;StateT |= RollT

  jp roundtail
```

Ici j'utilise ``RollT`` comme variable temporaire en plus de ``StateT``. Au final le nom de ces deux variables n'a pas réellement d'importance ;)

### Construction de la chaine à hacher (blocs SHA1)

Comme vaguement évoqué dans le chapitre sur l'initialisation SHA1, cet algorithme utilise des blocs de **64 octets**.

Pour le moment je n'ai pas implémenté la génération des blocs, c'est donc une évolution future tout à fait envisageable !

En attendant, afin de tester correctement le calcul du SHA1, j'ai fait un petit script python afin de générer les blocs :

```python
#!/usr/bin/env python3

import getopt, sys, io
import binascii

def usage():
    print("""
Usage : build-blocks.py [OPTIONS] <source>

Options :
-f  Source as file
-o  Output format (raw,hex,base64), default : hex
""")
    sys.exit(2)

def output(block, format):
    if format == "raw":
        print(block.decode('unicode_escape'))
    elif format == "hex":
        print(binascii.b2a_hex(block).decode())
    elif format == "base64":
        print(binascii.b2a_base64(block).decode())

def main():
    try:
        opts, args = getopt.getopt(sys.argv[1:],"o:fh",["file", "output", "help"])
    except getopt.GetoptError as error:
        print(error)
        usage()
    source = ' '.join(args).encode()
    isFile = False
    out = "hex"
    for opt, arg in opts:
        if opt in ("-h", "--help"):
            usage()
        elif opt in ("-f", "--file"):
            isFile = True
        elif opt in ("-o", "--output"):
            if arg in ("raw", "hex", "base64"):
                out = arg
            else:
                usage()
        else:
            usage()

    reader = open(source, "rb") if isFile else io.BytesIO(source)
    sourcelen = 0
    block = b''

    while True:
        block = reader.read(64)
        if len(block) < 64:
            sourcelen += len(block)
            break
        sourcelen += 64
        output(block, out)

    block += b'\x80'
    if len(block) >= 57:
        block += bytes(64-len(block))
        output(block, out)
        block = b''
    
    block += bytes(57-len(block))
    blocklen = bytes([((sourcelen & 0x1F) << 3) & 0xFF])
    sourcelen >>= 5
    for i in range(1, 7):
        blocklen += bytes([sourcelen & 0xFF])
        sourcelen >>= 8
    block += blocklen[::-1]
    output(block, out)

    reader.close()

if __name__ == "__main__":
    main()
```

Ce script permet donc de générer les blocs (1 par ligne) pour le message passé en argument (``source``), ou via le contenu d'un fichier en précisant l'option ``-f``.  
L'option ``-o`` permet également de définir le format de sortie, à savoir :

- ``raw`` : Données brutes **Attention cependant aux retours à la ligne, un bloc doit faire 64 octets même si il contient des retours à la ligne**
- ``hex`` : Données en hexadécimal
- ``base64`` : Données en base64

On peut désormais insérer ces blocs dans le code assembleur, voici un exemple pour le message **test** :

```nasm
  ;Message : test
  ;Init Block 1
  ;Data (64 bytes) = test + \x80 + \x00*58 + \x20
  ld hl,Block           ;hl = Block
  ld a,$74              ;a = 0x74
  ldi (hl),a            ;(hl) = a, hl += 1
  ld a,$65              ;a = 0x65
  ldi (hl),a            ;(hl) = a, hl += 1
  ld a,$73              ;a = 0x73
  ldi (hl),a            ;(hl) = a, hl += 1
  ld a,$74              ;a = 0x74
  ldi (hl),a            ;(hl) = a, hl += 1
  ld a,$80              ;a = 0x80
  ldi (hl),a            ;(hl) = a, hl += 1
  ld b,58               ;b = 58
  xor a                 ;a = 0
initblock1:
  ldi (hl),a            ;(hl) = a, hl += 1
  dec b                 ;b -= 1
  jr nz,initblock1      ;Si b > 0 : Jump initblock1
  ld a,$20              ;a = 0x20
  ldi (hl),a            ;(hl) = a, hl += 1
  call sha1
```

Après avoir inséré le bloc dans la variable bloc on appel ``sha1`` pour exécuter les calculs.

Dans le cas où on a plusieurs blocs, il faut quand même appeler ``sha1`` sur le premier bloc puis appeler ``sha1next`` à la place pour les prochains blocs !

### Récupération du hash

Comme indiqué dans le chapitre sur l'espace mémoire nécessaire, le hash est stocké dans les variables ``StateA`` à ``StateE``.

Le 20 octets de ces 5 variables cumulées correspondent au hash et sont accessibles de l'adresse mémoire ``C001`` à ``C014``.

## Conclusion

Ce projet a été un challenge très intéressant pour moi. J'ai pris beaucoup de plaisir à découvrir une partie des possibilités qu'offre la GameBoy.

Il y a encore pas mal d'optimisations/évolutions possibles pour ce projet et je n'exclus pas une éventuelle seconde partie à cet article !

Un grand merci à [entropyQueen](https://ark444.github.io/){:target="_blank"} pour m'avoir motivé (sans le vouloir ^^) à me lancer dans ce projet.

## Sources et inspirations

- [Code du projet](https://github.com/Elrindel/SHA1-GameBoy){:target="_blank"}
- [Spécifications GameBoy](specifications-gameboy){:target="_blank"}
- [Blog d'entropyQueen](https://ark444.github.io/){:target="_blank"}
- [Article de Furrtek](http://furrtek.free.fr/?a=gbasm){:target="_blank"}
- [Source SHA1 en C et assembleur x86](https://www.nayuki.io/page/fast-sha1-hash-implementation-in-x86-assembly){:target="_blank"}