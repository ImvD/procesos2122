function ServidorWS() {
  //Zona cliente del servidor WS, contiene métodos genéricos
  this.enviarAlRemitente = function (socket, mens, datos) {
    socket.emit(mens, datos);
  };
  this.enviarATodos = function (io, codigo, mens, datos) {
    io.sockets.in(codigo).emit(mens, datos);
  };
  this.enviarATodosMenosRemitente=function(socket, nombre, mens,datos){
		socket.to(nombre).emit(mens,datos);
	}
  this.enviarGlobal = function (socket, mens, datos) {
    socket.broadcast.emit(mens, datos);
  };

  //Zona servidor del servidor WS.
  this.lanzarServidorWS = function (io, juego) {
    var cli = this; // variable para que el contexto de la ejecución continúe en este objeto
    io.on("connection", function (socket) {
      console.log("Usuario conectado");

      socket.on("crearPartida", function (nick, num) {
        var jugador = juego.usuarios[nick];
        if (jugador) {
          var res = { codigo: -1 };
          var partida = jugador.crearPartida(num);
          if (partida) {
            console.log(
              "Nueva partida de " + nick + ", codigo:" + jugador.codigoPartida
            );
            res.codigo = jugador.codigoPartida;
            socket.join(res.codigo);
            cli.enviarAlRemitente(socket, "partidaCreada", res);
            var lista=juego.obtenerPartidasDisponibles();
						cli.enviarGlobal(socket,"nuevaPartida",lista);
          } else {
            cli.enviarAlRemitente(
              socket,
              "fallo",
              "La partida no se puede crear"
            );
          }
        } else {
          cli.enviarAlRemitente(socket, "fallo", "El usuario no existe");
        }
      });
      socket.on("unirAPartida", function (nick, codigo) {
        var jugador = juego.usuarios[nick];
        var res = { codigo: -1 };
        var partida = juego.partidas[codigo];
        if (jugador && partida) {
          jugador.unirAPartida(codigo);
          res.codigo = jugador.codigoPartida;
          if (res.codigo != -1) {
            socket.join(res.codigo);
            console.log("El jugador " + nick +" se ha unido a la partida con codigo: " + jugador.codigoPartida);            
            var partida = juego.partidas[codigo];
            cli.enviarAlRemitente(socket, "unidoAPartida", res);
            if (partida.fase.nombre == "jugando") {
              cli.enviarATodos(io, codigo, "pedirCartas", {});
              var lista=obtenerPartidasDisponibles();
							cli.enviarATodos(io,"nuevaPartida",lista)
              console.log("La partida está en fase jugando");
            }
          } else {
            cli.enviarAlRemitente(socket, "fallo", res);
          }
        } else {
          cli.enviarAlRemitente(socket, "fallo", "El usuario o la partida no existen");
        }
      });
      socket.on("manoInicial", function (nick) {
        var jugador = juego.usuarios[nick];
        if (jugador) {
          jugador.manoInicial();
          cli.enviarAlRemitente(socket, "mano", jugador.mano);
          var codigo = jugador.codigoPartida;
          var partida = juego.partidas[codigo];
          var nickTurno = partida.turno.nick;
          cli.enviarAlRemitente(socket, "turno", {
            "turno": nickTurno,
            "cartaActual": partida.cartaActual});
        } else {
          cli.enviarAlRemitente(socket, "fallo", "El usuario o la partida no existen");
        }
      });
      socket.on("jugarCarta", function (nick, num) {
        var jugador = juego.usuarios[nick];
        if (jugador) {
          jugador.jugarCarta(num);
          cli.enviarAlRemitente(socket, "mano", jugador.mano);
          var codigo = jugador.codigoPartida;
          var partida = juego.partidas[codigo];
          var nickTurno = partida.turno.nick;
          cli.enviarATodos(io, codigo, "turno", {
            "turno": nickTurno,
            "cartaActual": partida.cartaActual
          });
          if (partida.fase.nombre == "final") {
            console.log("La partida está en fase final");
            cli.enviarATodos(io, codigo, "final", { "ganador": nickTurno });
          }
        } else {
          cli.enviarAlRemitente(socket, "fallo", "El usuario o la partida no existen");
        }
      });
      socket.on("robarCarta", function (nick,num) {
        var jugador = juego.usuarios[nick];
        if (jugador) {
          jugador.robar(num);
          cli.enviarAlRemitente(socket, "mano", jugador.mano);
        } else {
          cli.enviarAlRemitente(socket, "fallo", "El usuario o la partida no existen");
        }
      });
      socket.on("pasarTurno", function (nick) {
        var jugador = juego.usuarios[nick];
        if (jugador) {
          jugador.pasarTurno();
          var codigo = jugador.codigoPartida;
          var partida = juego.partidas[codigo];
          var nickTurno = partida.turno.nick;
          cli.enviarAlRemitente(socket, "turno", {
            "turno": nickTurno,
            "cartaActual": partida.cartaActual
          });
        } else {
          cli.enviarAlRemitente(socket, "fallo", "El usuario o la partida no existen");
        }
      });
      socket.on("abandonarPartida",function(){
				var jugador=juego.usuarios[nick];
				if (jugador){
					jugador.abandonarPartida();
					var codigo=jugador.codigoPartida;
					cli.enviarATodos(io,codigo,"jugadorAbandona",{});

				}
			});
			socket.on("cerrarSesion",function(){
				var jugador=juego.usuarios[nick];
				if (jugador){
					var codigo=jugador.codigoPartida;
					var partida=juego.partidas[codigo];
					if (partida){
						jugador.abandonarPartida();
						cli.enviarATodosMenosRemitente(socket, jugador.nick,"jugadorAbandona",{});
					}
					jugador.cerrarSesion();
					cli.enviarAlRemitente(socket,"usuarioEliminado",{});
				}
			});
    });
  };
}
module.exports.ServidorWS = ServidorWS;
