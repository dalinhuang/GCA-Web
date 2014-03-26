// Copyright © 2014, German Neuroinformatics Node (G-Node)
//                   A. Stoewer (adrian.stoewer@rz.ifi.lmu.de)
//
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted under the terms of the BSD License. See
// LICENSE file in the root of the Project.

package models

import models.Model._
import javax.persistence.{ManyToOne, Entity}

/**
 * Very simple model for referenced literature.
 */
@Entity
class Reference extends PositionedModel {

  var authors: String = _
  var title: String = _
  var year: Int = _
  var doi: String = _

  @ManyToOne
  var abstr: Abstract = _

}


object Reference {

  def apply(uuid: Option[String],
            authors: Option[String],
            title: Option[String],
            year: Option[Int],
            doi: Option[String],
            abstr: Option[Abstract] = None) : Reference = {

    val ref     = new Reference()

    ref.uuid    = unwrapRef(uuid)
    ref.authors = unwrapRef(authors)
    ref.title   = unwrapRef(title)
    ref.year    = unwrapVal(year)
    ref.doi     = unwrapRef(doi)

    ref.abstr   = unwrapRef(abstr)

    ref
  }

}
