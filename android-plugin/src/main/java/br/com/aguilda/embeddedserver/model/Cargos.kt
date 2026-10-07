package br.com.aguilda.embeddedserver.model

data class Cargo(
    val id: String,
    val label: String,
    val abreviacao: String? = null,
    val categoria: String
)

object Cargos {

    val LISTA: List<Cargo> = listOf(
        Cargo("presidente", "Presidente", "Presidente", "autoridade"),
        Cargo("senador", "Senador(a)", "Sen.", "autoridade"),
        Cargo("deputado_federal", "Deputado(a) Federal", "Dep. Federal", "autoridade"),
        Cargo("deputado_estadual", "Deputado(a) Estadual", "Dep. Estadual", "autoridade"),
        Cargo("prefeito", "Prefeito(a)", "Prefeito", "autoridade"),
        Cargo("vice_prefeito", "Vice-Prefeito(a)", "Vice-Prefeito", "autoridade"),
        Cargo("vereador", "Vereador(a)", "Vereador", "autoridade"),
        Cargo("militar", "Militar", "Militar", "autoridade"),
        Cargo("pastor", "Pastor-Presidente / Pastor", "Pr.", "eclesiastico"),
        Cargo("evangelista", "Evangelista", "Ev.", "eclesiastico"),
        Cargo("presbitero", "Presbitero / Anciao", "PB.", "eclesiastico"),
        Cargo("diacono", "Diacono", "Dc.", "eclesiastico"),
        Cargo("auxiliar", "Auxiliar / Cooperador", "Aux.", "eclesiastico"),
        Cargo("sem_cargo", "Sem cargo", null, "nenhum")
    )

    private val ordem: Map<String, Int> = LISTA.mapIndexed { indice, cargo -> cargo.id to indice }.toMap()

    fun precedencia(cargoId: String): Int = ordem[cargoId] ?: ordem.getValue("sem_cargo")

    fun get(cargoId: String): Cargo = LISTA.find { it.id == cargoId } ?: LISTA.last()

    fun tituloExibicao(cargoId: String): String = get(cargoId).abreviacao ?: ""
}
