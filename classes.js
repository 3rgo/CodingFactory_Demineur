function randomInt(min, max) {
    return Math.floor(Math.random() * max) + min;
}

class Case {
    constructor(ligne, colonne) {
        // Coordonnees
        this.ligne = ligne;
        this.colonne = colonne;
        //Attributs
        this.cachee = true;
        this.nombre = null;
        this.drapeau = false;
        this.bombe = false;
        this.explosee = false;
    }

    ajouterBombe() {
        this.bombe = true;
        this.nombre = null;
    }

    clicDrapeau() {
        this.drapeau = !this.drapeau;
    }

    genererHTML() {
        var nom_image;
        if (this.cachee) {
            if (this.drapeau) {
                nom_image = "flag";
            } else {
                nom_image = "normal";
            }
        } else {
            if (this.bombe) {
                nom_image = "bomb";
            } else if (this.nombre == 0) {
                nom_image = "empty";
            } else {
                nom_image = this.nombre;
            }
        }
        var image = $('<img />')
            .attr('src', 'images/' + nom_image + '.png')
            .addClass('case')
            .data('ligne', this.ligne)
            .data('colonne', this.colonne);

        if (this.explosee) {
            image.css('border', '1px solid red');
        }
        return $('<td></td>').append(image);
    }
}

class Plateau {
    constructor(tailleCote, nombreBombes) {
        // On stocke les paramètres
        this.tailleCote = tailleCote;
        this.nombreBombes = nombreBombes;
        this.result = null;

        // On génère le tableau de cases
        var tab = [];
        for (var i = 0; i < this.tailleCote; i++) {
            var row = [];
            for (var j = 0; j < this.tailleCote; j++) {
                row.push(new Case(i, j));
            }
            tab.push(row);
        }
        this.tableau = tab;

        // On cache le résultat
        $('footer').text("").hide();

        // On place aléatoirement les bombes
        this.placerBombes();

        // On affiche le plateau
        this.afficher();

        // On démarre le timer d'affichage du temps
        this.timestampDebut = Date.now();
        var me = this;

        this.stop();
        this.timer = setInterval(function () {
            var duree = Date.now() - me.timestampDebut;
            duree = Math.floor(duree / 1000);
            var sec = duree % 60,
                min = (duree - sec) / 60;
            $('#affichageTemps').text((min + "").padStart(2, "0") +
                ":" + (sec + "").padStart(2, "0"));
        }, 50);
    }

    stop() {
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    afficher(sansEcouteurs) {
        $('table#plateau td img').off('click');
        $('table#plateau td img').off('contextmenu');
        var table = $('<table></table>').attr('id', 'plateau');
        for (var i in this.tableau) {
            var ligne = $('<tr></tr>');
            for (var j in this.tableau[i]) {
                ligne.append(this.tableau[i][j].genererHTML());
            }
            table.append(ligne);
        }
        $('main').html("").append(table);
        var me = this;
        if (sansEcouteurs !== true) {
            $('table#plateau td img').on('click', function () {
                me.clicCase($(this));
            });
            $('table#plateau td img').on('contextmenu', function (e) {
                e.preventDefault();
                me.tableau[$(this).data('ligne')][$(this).data('colonne')].clicDrapeau();
                me.afficher();
            });
        }
    }

    placerBombes() {
        var cpt = this.nombreBombes;
        do {
            // On génère des coordonnées aléatoire jusqu'à trouver une cellule sans bombe
            var rand_ligne, rand_colonne;
            do {
                rand_ligne = randomInt(0, this.tailleCote - 1);
                rand_colonne = randomInt(0, this.tailleCote - 1);
            } while (this.tableau[rand_ligne][rand_colonne].bombe == true);
            // On positionne la bombe sur ces coordonnées
            this.tableau[rand_ligne][rand_colonne].ajouterBombe();
            cpt--;
        } while (cpt > 0);

        // On repasse toutes les cellules pour trouver le nombre de bombes voisines
        for (var i in this.tableau) {
            for (var j in this.tableau[i]) {
                if (this.tableau[i][j].bombe == false) {
                    var voisins = this.getVoisins(this.tableau[i][j]);
                    this.tableau[i][j].nombre = voisins.reduce(function (total, c) {
                        return total + (c.bombe ? 1 : 0);
                    }, 0);
                }
            }
        }
    }

    clicCase(caseEl) {
        var ligne = caseEl.data('ligne'),
            col = caseEl.data('colonne');
        if (ligne < 0 || ligne >= this.tailleCote || col < 0 || col >= this.tailleCote) {
            return false;
        }
        var c = this.tableau[ligne][col];
        if (c.bombe) {
            this.result = false;
            c.explosee = true;
        } else {
            // Pas de bombe, on révèle la cellule
            // et les cellules voisines vides en cascade
            var voisins = [c];
            do {
                var next = voisins.shift();
                if (next.cachee) {
                    if (next.nombre === 0) {
                        voisins = voisins.concat(this.getVoisins(next));
                    }
                    next.cachee = false;
                }
            } while (voisins.length > 0);

            if (this.aGagne()) {
                this.result = true;
            }
        }

        // Si partie finie
        if (this.result !== null) {
            // On arrête le timer
            this.stop();
            // On enlève les écouteurs de click
            $('table#plateau td img').off('click');
            $('table#plateau td img').off('contextmenu');
            // On révèle le plateau
            for (var i in this.tableau) {
                for (var j in this.tableau[i]) {
                    this.tableau[i][j].cachee = false;
                }
            }
            $('footer').show()
                .text(this.result ? 'GAGNÉ !' : 'PERDU !')
                .css('color', this.result ? 'green' : 'red');

        }

        this.afficher(this.result !== null);
    }

    getVoisins(casePlateau) {
        var voisins = [];
        if (casePlateau.ligne > 0) {
            voisins.push(this.tableau[casePlateau.ligne - 1][casePlateau.colonne]);
        }
        if (casePlateau.ligne < (this.tailleCote - 1)) {
            voisins.push(this.tableau[casePlateau.ligne + 1][casePlateau.colonne]);
        }
        if (casePlateau.colonne > 0) {
            voisins.push(this.tableau[casePlateau.ligne][casePlateau.colonne - 1]);
        }
        if (casePlateau.colonne < (this.tailleCote - 1)) {
            voisins.push(this.tableau[casePlateau.ligne][casePlateau.colonne + 1]);
        }
        if (casePlateau.ligne > 0 && casePlateau.colonne > 0) {
            voisins.push(this.tableau[casePlateau.ligne - 1][casePlateau.colonne - 1]);
        }
        if (casePlateau.ligne > 0 && casePlateau.colonne < (this.tailleCote - 1)) {
            voisins.push(this.tableau[casePlateau.ligne - 1][casePlateau.colonne + 1]);
        }
        if (casePlateau.ligne < (this.tailleCote - 1) && casePlateau.colonne > 0) {
            voisins.push(this.tableau[casePlateau.ligne + 1][casePlateau.colonne - 1]);
        }
        if (casePlateau.ligne < (this.tailleCote - 1) && casePlateau.colonne < (this.tailleCote - 1)) {
            voisins.push(this.tableau[casePlateau.ligne + 1][casePlateau.colonne + 1]);
        }
        return voisins;
    }

    /**
     * Fonction qui vérifie toutes les cases du plateau,
     * et si on a au moins une case cahée qui ne contient
     * pas de bombe, la partie n'est pas finie
     */
    aGagne() {
        for (var i in this.tableau) {
            for (var j in this.tableau[i]) {
                if (this.tableau[i][j].cachee && !this.tableau[i][j].bombe) {
                    return false;
                }
            }
        }
        return true;
    }
}